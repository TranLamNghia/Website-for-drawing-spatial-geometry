using System;
using System.Linq;
using System.Data;
using System.Collections.Generic;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;

namespace Application.Compilers;

public class GeometryCompiler : IGeometryCompiler
{
    private readonly IEnumerable<IFactHandler> _handlers;
    private readonly FactValidationEngine _validationEngine;

    public GeometryCompiler(IEnumerable<IFactHandler> handlers, FactValidationEngine validationEngine)
    {
        _handlers = handlers;
        _validationEngine = validationEngine;
    }

    public CompilationContext Compile(GeometryProblemDto problem)
    {
        // Khởi tạo cuốn sổ tay trắng
        var context = new CompilationContext();

        // Giai đoạn 1: Dựng móng nhà (Mặt đáy nằm trên mp z = 0)
        BuildBase(problem, context);

        // Giai đoạn 1.5: Dựng trước các điểm ở đáy (như trung điểm, trọng tâm...) để dùng làm hình chiếu
        BuildDependentEntities(problem, context);

        // Giai đoạn 2: Tìm hình chiếu và dựng chiều cao Z cho đỉnh chóp
        BuildApex(problem, context);
        // Dựng đáy trên cho khối lăng trụ (nếu có)
        BuildPrismTopBase(problem, context);

        // Giai đoạn 2.5: Dựng vùng không gian (Volume) cho các khối đặc đã nhận diện
        BuildVolumePlanes(problem, context);

        // Giai đoạn 3: Tính toán trung điểm, trọng tâm, giao điểm... (cho các cạnh bên, v.v...)
        BuildDependentEntities(problem, context);

        // Bỏ đoạn tự sửa tên điểm descriptiveKeys theo ý kiến người dùng để giữ nguyên điểm AI trả về

        // Xóa bỏ phần thập phân nhỏ hơn 1e-10
        foreach (var key in context.Points.Keys.ToList())
        {
            var p = context.Points[key];
            p.X = Math.Abs(p.X) < 1e-10 ? 0 : Math.Round(p.X, 4);
            p.Y = Math.Abs(p.Y) < 1e-10 ? 0 : Math.Round(p.Y, 4);
            p.Z = Math.Abs(p.Z) < 1e-10 ? 0 : Math.Round(p.Z, 4);
        }
        // Giai đoạn 4: KIỂM ĐỊNH NGƯỢC (Validation)
        // Dùng tọa độ vừa dựng để kiểm tra ngược lại từng Fact (Diện tích, Độ dài, Góc...)
        context.ValidationReport = _validationEngine.Validate(problem, context);

        return context;
    }

    public void RefineWithNewPoints(CompilationContext context, GeometryProblemDto problem, Dictionary<string, Point3D> newPoints)
    {
        Console.WriteLine($"[COMPILER] Mở khóa sức mạnh AI Fallback! Đang sáp nhập {newPoints.Count} điểm mới vào hệ thống...");
        
        // Ghi đè tọa độ
        foreach (var kvp in newPoints)
        {
            if (context.Points.ContainsKey(kvp.Key))
            {
                context.Points[kvp.Key] = kvp.Value;
            }
            else
            {
                context.Points.Add(kvp.Key, kvp.Value);
            }
        }

        // Chạy lại hàm dựng điểm phụ (trung điểm, trọng tâm...) để các đỉnh AI sinh ra tạo ra trung điểm / giao điểm chuẩn
        BuildDependentEntities(problem, context);

        // Chạy lại kiểm định vòng 2
        context.ValidationReport = _validationEngine.Validate(problem, context);
        
        Console.WriteLine($"[COMPILER] Fallback hoàn tất. Kết quả Re-Validation: AllPassed = {context.ValidationReport.AllPassed}");
    }

    /// <summary>
    /// Giai đoạn 1: Đọc Fact "shape" và dựng tọa độ mặt đáy (z = 0)
    /// </summary>
    private void BuildBase(GeometryProblemDto problem, CompilationContext context)
    {
        var valid2D = new[] { ShapeType.Square, ShapeType.Rectangle, ShapeType.Rhombus, ShapeType.Parallelogram, ShapeType.Trapezoid, ShapeType.Triangle, ShapeType.Equilateral_triangle, ShapeType.Right_triangle, ShapeType.Isosceles_triangle, ShapeType.Isosceles_right_triangle };
        var valid3D = new[] { ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron, ShapeType.Cube, ShapeType.Rectangular_cuboid, ShapeType.Pyramid, ShapeType.Regular_pyramid, ShapeType.Prism, ShapeType.Regular_prism, ShapeType.Parallelepiped, ShapeType.Regular_parallelepiped };

        var shapeFacts = problem.Facts
            .Where(f => f.Type == FactType.Shape)
            .Select(f => f.GetDataAs<ShapeData>())
            .Where(d => d != null)
            .ToList();
                
        var baseFact = shapeFacts.FirstOrDefault(d => d != null && valid2D.Contains(d.Shape));
        var solidFact = shapeFacts.FirstOrDefault(d => d != null && valid3D.Contains(d.Shape));

        if (baseFact == null && solidFact == null) return;

        string rawTarget = "";
        ShapeType effectiveShape = ShapeType.Triangle;

        if (baseFact != null && !string.IsNullOrWhiteSpace(baseFact.Target))
        {
            rawTarget = baseFact.Target;
            effectiveShape = baseFact.Shape;
        }
        else if (solidFact != null && !string.IsNullOrWhiteSpace(solidFact.Target))
        {
            rawTarget = solidFact.Target;
        }

        // Tách danh sách đỉnh (Hỗ trợ A, B, C, A', B1...)
        List<string> allVertices = ParseVertices(rawTarget);
        
        // 2. TÁCH ĐỈNH - ĐÁY VÀ GHI ĐÈ TÍNH CHẤT (OVERRIDE PROPERTIES)
        List<string> baseVertices = new List<string>(allVertices);
        
        if (solidFact != null && rawTarget == solidFact.Target)
        {
            if (solidFact.Shape == ShapeType.Pyramid || solidFact.Shape == ShapeType.Regular_pyramid)
            {
                // Giả định: Hình chóp S.ABC... có đỉnh S đứng trước hoặc dùng dấu "."
                if (rawTarget.Contains(".")) {
                    baseVertices = ParseVertices(rawTarget.Split('.')[1]);
                } else if (baseVertices.Count > 3) {
                    baseVertices.RemoveAt(0);
                }
            }
            else if (solidFact.Shape == ShapeType.Tetrahedron || solidFact.Shape == ShapeType.Regular_tetrahedron)
            {
                // Giả định: Tứ diện ABCD có đáy là BCD
                if (baseVertices.Count >= 4 && baseFact == null) baseVertices.RemoveAt(0); 
            }
            else if (solidFact.Shape == ShapeType.Prism || solidFact.Shape == ShapeType.Regular_prism)
            {
                // Hình lăng trụ ABC.A'B'C' -> Đáy là ABC
                if (rawTarget.Contains(".")) {
                    baseVertices = ParseVertices(rawTarget.Split('.')[0]);
                } else if (baseVertices.Count >= 6) {
                    baseVertices = baseVertices.Take(baseVertices.Count / 2).ToList();
                }
            }
        }

        if (solidFact != null)
        {
            if (solidFact.Shape == ShapeType.Regular_tetrahedron) effectiveShape = ShapeType.Equilateral_triangle;
            else if (solidFact.Shape == ShapeType.Cube) effectiveShape = ShapeType.Square;
        }

        if (baseVertices.Count < 3)
        {
             // Fallback
             baseVertices = (solidFact != null && (solidFact.Shape == ShapeType.Cube || solidFact.Shape == ShapeType.Rectangular_cuboid)) 
                            ? new List<string> { "A", "B", "C", "D" } : new List<string> { "A", "B", "C" };
        }

        // 3. TÍNH TOÁN KÍCH THƯỚC ĐỘNG
        double aValue = context.UnitLength;

        double width = GetDynamicEdgeLength(problem, baseVertices, 0, 1, -1, aValue);
        if (width == -1 && baseVertices.Count >= 4) width = GetDynamicEdgeLength(problem, baseVertices, 2, 3, -1, aValue);
        if (width == -1) width = aValue; 

        double height = GetDynamicEdgeLength(problem, baseVertices, 1, 2, -1, aValue);
        if (height == -1 && baseVertices.Count >= 4) height = GetDynamicEdgeLength(problem, baseVertices, 0, 3, -1, aValue);
        if (height == -1) 
        {
            if (effectiveShape == ShapeType.Rectangle || effectiveShape == ShapeType.Parallelogram) height = width * 2;
            else if (effectiveShape == ShapeType.Triangle) height = width * 1.4; // Tránh cân bằng 
            else height = width; 
        }

        string baseName = string.Join("", baseVertices);
        Console.WriteLine($"[COMPILER] Tổng hợp Fact: Tên đáy={baseName}, Hình dáng={effectiveShape}");

        if (baseVertices.Count >= 3)
        {
            var edgeLengths = new System.Collections.Generic.List<double>();
            int n = baseVertices.Count;

            // Quét vòng quanh đa giác (VD ABCD: AB, BC, CD, DA)
            for (int i = 0; i < n; i++)
            {
                int nextIndex = (i + 1) % n;
                double l = GetDynamicEdgeLength(problem, baseVertices, i, nextIndex, -1, aValue);
                if (l != -1) edgeLengths.Add(l);
            }

            // Nếu thu thập ĐỦ số cạnh và TẤT CẢ các cạnh đều bằng nhau
            if (edgeLengths.Count == n && edgeLengths.All(l => Math.Abs(l - edgeLengths[0]) < 1e-6))
            {
                if (n == 3) 
                {
                    effectiveShape = ShapeType.Equilateral_triangle;
                    width = edgeLengths[0];
                }
                else if (n == 4)
                {
                    if (effectiveShape != ShapeType.Square) 
                    {
                        effectiveShape = ShapeType.Rhombus;
                    }
                    width = edgeLengths[0];
                }
            }
        }

        // 4. DỰNG TỌA ĐỘ PHẲNG (Z = 0)
        switch (effectiveShape)
        {
            case ShapeType.Square:
            case ShapeType.Rectangle: 
                if (baseVertices.Count >= 4) {
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0);      
                    context.Points[baseVertices[1]] = new Point3D(width, 0, 0);      
                    context.Points[baseVertices[2]] = new Point3D(width, height, 0);  
                    context.Points[baseVertices[3]] = new Point3D(0, height, 0);  
                }
                break;

            case ShapeType.Rhombus: // Hình thoi 
            case ShapeType.Parallelogram: // Hình bình hành
                if (baseVertices.Count >= 4) {
                    double b = height; // AD (hoặc BC)
                    double c = width;  // AB
                    if (effectiveShape == ShapeType.Rhombus) b = c; // Hình thoi b = c
                    
                    double diagBD = GetDynamicEdgeLength(problem, baseVertices, 1, 3, -1, aValue); // BD
                    double diagAC = GetDynamicEdgeLength(problem, baseVertices, 0, 2, -1, aValue); // AC
                    double explicitAngleA = GetDynamicAngle(problem, baseVertices, 0, 1, 3); // Cố gắng đọc góc đỉnh Mốc (A)

                    double cosA = 0.5; // Mặc định góc A = 60 độ
                    if (explicitAngleA > 0) {
                        cosA = Math.Cos(explicitAngleA * Math.PI / 180.0);
                    } else if (diagBD > 0) {
                        cosA = (b*b + c*c - diagBD*diagBD) / (2*b*c);
                    } else if (diagAC > 0) {
                        cosA = (diagAC*diagAC - b*b - c*c) / (2*b*c);
                    }
                    
                    cosA = Math.Max(-1, Math.Min(1, cosA));
                    double sinA = Math.Sqrt(1 - cosA*cosA);
                    
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0);       
                    context.Points[baseVertices[1]] = new Point3D(c, 0, 0);       
                    context.Points[baseVertices[3]] = new Point3D(b * cosA, b * sinA, 0); 
                    context.Points[baseVertices[2]] = new Point3D(c + b * cosA, b * sinA, 0); 
                }
                break;

            case ShapeType.Trapezoid: 
                if (baseVertices.Count >= 4) {
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0);                
                    context.Points[baseVertices[1]] = new Point3D(width, 0, 0);            
                    context.Points[baseVertices[2]] = new Point3D(width * 0.5, height, 0); 
                    context.Points[baseVertices[3]] = new Point3D(0, height, 0);           
                }
                break;

            case ShapeType.Equilateral_triangle: 
                if (baseVertices.Count >= 3) {
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0); 
                    context.Points[baseVertices[1]] = new Point3D(width, 0, 0); 
                    context.Points[baseVertices[2]] = new Point3D(width / 2.0, width * Math.Sqrt(3) / 2.0, 0); 
                }
                break;

            case ShapeType.Right_triangle: 
                if (baseVertices.Count >= 3) {
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0); 
                    context.Points[baseVertices[1]] = new Point3D(width, 0, 0); 
                    context.Points[baseVertices[2]] = new Point3D(0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_triangle: 
                if (baseVertices.Count >= 3) {                    
                    context.Points[baseVertices[1]] = new Point3D(0, 0, 0); 
                    context.Points[baseVertices[2]] = new Point3D(width, 0, 0); 
                    context.Points[baseVertices[0]] = new Point3D(width / 2.0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_right_triangle:
                if (baseVertices.Count >= 3) {
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0); 
                    context.Points[baseVertices[1]] = new Point3D(width, 0, 0); 
                    context.Points[baseVertices[2]] = new Point3D(0, width, 0); 
                }
                break;

            case ShapeType.Triangle: 
            default: 
                if (baseVertices.Count >= 3) {
                    double ac = GetDynamicEdgeLength(problem, baseVertices, 0, 2, -1, aValue);
                    double aLen = height; 
                    double cLen = width;  
                    
                    double cosB = 0.3; 
                    if (ac > 0) {
                        cosB = (aLen*aLen + cLen*cLen - ac*ac) / (2*aLen*cLen);
                        cosB = Math.Max(-1, Math.Min(1, cosB));
                    }
                    
                    double sinB = Math.Sqrt(1 - cosB*cosB);
                    context.Points[baseVertices[0]] = new Point3D(0, 0, 0); 
                    context.Points[baseVertices[1]] = new Point3D(cLen, 0, 0); 
                    context.Points[baseVertices[2]] = new Point3D(cLen - aLen * cosB, aLen * sinB, 0); 
                }
                break;
        }

        // 5. ĐĂNG KÝ CẠNH ĐÁY VÀ MẶT ĐÁY VÀO CONTEXT
        for (int i = 0; i < baseVertices.Count; i++)
        {
            context.AddGeneratedSegment(baseVertices[i], baseVertices[(i + 1) % baseVertices.Count]);
        }
        context.GeneratedPlanes.Add(new PlaneData { Points = baseVertices.ToArray() });

        Console.WriteLine($"[COMPILER] --- GĐ1: Đã dựng {context.Points.Count} điểm mặt đáy ---");
        foreach(var kvp in context.Points) Console.WriteLine($"   -> {kvp.Key}: {kvp.Value}");

        // 6. TỊNH TIẾN TRỌNG TÂM VỀ GỐC TỌA ĐỘ
        if (baseVertices.Count > 0)
        {
            var basePointsList = new System.Collections.Generic.List<Point3D>();
            foreach (string v in baseVertices)
            {
                if (context.Points.TryGetValue(v, out var pPt))
                {
                    basePointsList.Add(pPt);
                }
            }

            if (basePointsList.Count > 0)
            {
                var centroid = Point3D.GetCentroid(basePointsList.ToArray());

                foreach (string v in baseVertices)
                {
                    if (context.Points.ContainsKey(v))
                    {
                        var pPt = context.Points[v];
                        pPt.X -= centroid.X;
                        pPt.Y -= centroid.Y;
                        pPt.Z -= centroid.Z; 
                    }
                }
            }
        }
    }

    /// <summary>
    /// Hàm trợ giúp: Lấy độ dài cạnh linh hoạt dựa trên vị trí của đỉnh trong danh sách vertices.
    /// </summary>
    private double GetDynamicEdgeLength(GeometryProblemDto problem, List<string> vertices, int idx1, int idx2, double defaultVal, double aValue)
    {
        if (idx1 >= vertices.Count || idx2 >= vertices.Count) return defaultVal;

        string v1 = vertices[idx1];
        string v2 = vertices[idx2];
        string edge1 = $"{v1}{v2}"; 
        string edge2 = $"{v2}{v1}"; 

        var fact = problem.Facts.FirstOrDefault(f => 
        {
            if (f.Type != FactType.Length) return false;
            var ld = f.GetDataAs<LengthData>();
            return ld != null && (ld.Target == edge1 || ld.Target == edge2);
        });

        if (fact != null && fact.GetDataAs<LengthData>() is LengthData data && data.Value != null) {
            return EvaluateExpression(data.Value, aValue);
        }
        return defaultVal;
    }

    private double GetDynamicAngle(GeometryProblemDto problem, List<string> vertices, int vertexIdx, int adjIdx1, int adjIdx2)
    {
        if (vertices.Count < 3 || vertexIdx >= vertices.Count || adjIdx1 >= vertices.Count || adjIdx2 >= vertices.Count) return -1;
        
        string vStr = vertices[vertexIdx];
        string vAdj1 = vertices[adjIdx1];
        string vAdj2 = vertices[adjIdx2];
        
        string edge1 = $"{vStr}{vAdj1}";
        string edge2 = $"{vStr}{vAdj2}";
        string edge1_r = $"{vAdj1}{vStr}";
        string edge2_r = $"{vAdj2}{vStr}";

        var fact = problem.Facts.FirstOrDefault(f => 
        {
            if (f.Type != FactType.Angle) return false;
            var ad = f.GetDataAs<AngleData>();
            if (ad == null || ad.Objects == null || ad.Objects.Count < 2) return false;
            
            if (ad.AngleType == AngleType.line_line)
            {
                var o1 = ad.Objects[0];
                var o2 = ad.Objects[1];
                if ((o1 == edge1 || o1 == edge1_r) && (o2 == edge2 || o2 == edge2_r)) return true;
                if ((o2 == edge1 || o2 == edge1_r) && (o1 == edge2 || o1 == edge2_r)) return true;
            }
            return false;
        });

        if (fact != null && fact.GetDataAs<AngleData>() is AngleData data && data.Value != null)
        {
            return EvaluateExpression(data.Value, 0);
        }
        return -1;
    }
    
    private double EvaluateExpression(string expr, double a)
    {
        try {
            // 1. Chuẩn hóa biểu thức (về chữ thường, xóa cách)
            string sanitized = expr.ToLower().Replace(" ", "");
            
            // 2. Tự động thêm dấu nhân '*' vào các cụm như '2a', '3a' (Regex thông minh)
            // Tìm các trường hợp [Số][Chữ a] và thay bằng [Số]*[Chữ a]
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"(\d)a", "$1*a");

            // 3. Xử lý sqrt(...) thủ công trước khi đưa vào DataTable
            while (sanitized.Contains("sqrt("))
            {
                int start = sanitized.IndexOf("sqrt(");
                int end = findMatchingClosingParenthesis(sanitized, start + 4);
                if (end == -1) break;

                string inside = sanitized.Substring(start + 5, end - (start + 5));
                double insideVal = EvaluateExpression(inside, a);
                sanitized = sanitized.Substring(0, start) + Math.Sqrt(insideVal).ToString(System.Globalization.CultureInfo.InvariantCulture) + sanitized.Substring(end + 1);
            }

            // 4. Thay 'a' bằng giá trị thực (Sử dụng Culture Invariant để luôn dùng dấu '.')
            sanitized = sanitized.Replace("a", a.ToString(System.Globalization.CultureInfo.InvariantCulture));
            
            // 5. Tính toán bằng DataTable
            var dt = new System.Data.DataTable();
            return Convert.ToDouble(dt.Compute(sanitized, ""));
        } catch {
            return a; // Fallback mặc định trả về a nếu lỗi
        }
    }

    private int findMatchingClosingParenthesis(string text, int openPos) 
    {
        int closePos = openPos;
        int counter = 1;
        while (counter > 0) {
            char c = text[++closePos];
            if (c == '(') counter++;
            else if (c == ')') counter--;
        }
        return closePos;
    }

    private void BuildApex(GeometryProblemDto problem, CompilationContext context)
    {
        var valid3D = new[] { ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron, ShapeType.Pyramid, ShapeType.Regular_pyramid };
        var solidFact = problem.Facts
            .FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>() is ShapeData sd && valid3D.Contains(sd.Shape));
        
        if (solidFact == null || solidFact.GetDataAs<ShapeData>() is not ShapeData solidData) return;
        
        string rawTarget = solidData.Target ?? "";
        List<string> allVertices = ParseVertices(rawTarget);
        if (allVertices.Count < 4) 
        {
            // Fallback nếu trích xuất lỗi
            allVertices = new List<string> { "S", "A", "B", "C" };
        }

        string apexName = allVertices[0]; 
        List<string> baseVertices = allVertices.Skip(1).ToList();
        
        if (context.Points.ContainsKey(apexName)) return;

        Point3D? projectionPoint = null;

        // BƯỚC A: Tìm hình chiếu H
        // Ưu tiên 1: Fact "Hình chiếu" trực tiếp (Projection)
        var projFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Projection);
        if (projFact != null && projFact.GetDataAs<ProjectionData>() is ProjectionData pd && pd.From == apexName)
        {
            if (!string.IsNullOrEmpty(pd.Point) && context.Points.TryGetValue(pd.Point, out var p)) 
            {
                projectionPoint = p;
                Console.WriteLine($"[COMPILER] Hình chiếu của {apexName} là {pd.Point} (Từ Fact Projection)");
            }
            
            // Xử lý Fallback: Nếu AI trả về chuỗi thay vì đỉnh ("trọng tâm BCD", hoặc đỉnh bị lỗi point: "S")
            if (projectionPoint == null)
            {
                string textToParse = projFact.RawText.ToLower();
                string targetStr = string.IsNullOrWhiteSpace(pd.Point) || pd.Point.Length <= 1 ? projFact.RawText : pd.Point;
                
                int trongTamIdx = textToParse.IndexOf("trọng tâm");
                if (trongTamIdx >= 0)
                {
                    string subStr = targetStr.Substring(trongTamIdx);
                    var match = System.Text.RegularExpressions.Regex.Match(subStr, @"\b[A-Z][0-9]*'*[A-Z][0-9]*'*[A-Z][0-9]*'*\b");
                    if (match.Success)
                    {
                        var faceVertices = ParseVertices(match.Value);
                        var pts = faceVertices.Where(v => context.Points.ContainsKey(v))
                                              .Select(v => context.Points[v]).ToArray();
                        if (pts.Length >= 3) 
                        {
                            projectionPoint = Point3D.GetCentroid(pts);
                            string fallbackName = string.IsNullOrWhiteSpace(pd.Point) || ParseVertices(pd.Point).Count > 1 ? "H" : pd.Point;
                            context.Points[fallbackName] = projectionPoint;
                            Console.WriteLine($"[COMPILER] Hình chiếu của {apexName} là Trọng tâm {match.Value} (Đã sinh/dùng điểm {fallbackName})");
                        }
                    }
                }
                
                int trungDiemIdx = textToParse.IndexOf("trung điểm");
                if (projectionPoint == null && trungDiemIdx >= 0)
                {
                    string subStr = targetStr.Substring(trungDiemIdx);
                    var match = System.Text.RegularExpressions.Regex.Match(subStr, @"\b[A-Z][0-9]*'*[A-Z][0-9]*'*\b");
                    if (match.Success)
                    {
                        var edgeVertices = ParseVertices(match.Value);
                        if (edgeVertices.Count >= 2)
                        {
                            var p1 = context.GetPoint(edgeVertices[0]);
                            var p2 = context.GetPoint(edgeVertices[1]);
                            if (p1 != null && p2 != null) 
                            {
                                projectionPoint = p1.GetMidpoint(p2);
                                string fallbackName = string.IsNullOrWhiteSpace(pd.Point) || ParseVertices(pd.Point).Count > 1 ? "M" : pd.Point;
                                context.Points[fallbackName] = projectionPoint;
                                Console.WriteLine($"[COMPILER] Hình chiếu của {apexName} là Trung điểm {match.Value} (Đã sinh/dùng điểm {fallbackName})");
                            }
                        }
                    }
                }
            }
        }

        if (projectionPoint == null)
        {
            if (solidData.Shape == ShapeType.Regular_pyramid || solidData.Shape == ShapeType.Regular_tetrahedron)
            {
                var pts = baseVertices.Where(v => context.Points.ContainsKey(v))
                                      .Select(v => context.Points[v]).ToArray();
                if (pts.Length > 0) projectionPoint = Point3D.GetCentroid(pts);
            }
            else
            {
                // Tìm theo Fact vuông góc
                var perpFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Perpendicular);
                if (perpFact != null)
                {
                    if (context.Points.TryGetValue(baseVertices[0], out var p)) projectionPoint = p;
                }
                else
                {
                    // Suy luận logic: Kiểm tra cạnh bên bằng nhau
                    bool isAllLateralEqual = CheckIfLateralEdgesAreEqual(problem, apexName, baseVertices, context);

                    if (isAllLateralEqual)
                    {
                        var pts = baseVertices.Where(v => context.Points.ContainsKey(v))
                                              .Select(v => context.Points[v]).ToArray();
                        if (pts.Length > 0) projectionPoint = Point3D.GetCentroid(pts);
                        
                        Console.WriteLine($"[COMPILER] Suy luận: Các cạnh bên bằng nhau -> {apexName} chiếu xuống Trọng tâm đáy.");
                    }
                    else
                    {
                        // Heuristic: Mặt bên SAB đều và có góc vuông => (SAB) vuông góc đáy => Hình chiếu ở trung điểm AB
                        var eqFaceFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>()?.Shape == ShapeType.Equilateral_triangle && f.GetDataAs<ShapeData>()?.Target.Contains(apexName) == true);
                        var angleFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Angle && f.GetDataAs<AngleData>()?.Value == "90");

                        if (eqFaceFact != null && angleFact != null && eqFaceFact.GetDataAs<ShapeData>() is ShapeData faceData) {
                            var faceVertices = ParseVertices(faceData.Target);
                            var sidePoints = faceVertices.Where(v => v != apexName).ToList();

                            if (sidePoints.Count >= 2 && context.Points.ContainsKey(sidePoints[0]) && context.Points.ContainsKey(sidePoints[1])) {
                                var pt1 = context.GetPoint(sidePoints[0]);
                                var pt2 = context.GetPoint(sidePoints[1]);
                                if (pt1 != null && pt2 != null) {
                                    projectionPoint = pt1.GetMidpoint(pt2);
                                    Console.WriteLine($"[COMPILER] Suy luận: Mặt bên {faceData.Target} đều & vuông góc đáy -> Hình chiếu tại trung điểm {sidePoints[0]}{sidePoints[1]}.");
                                }
                            }
                        }

                        // Fallback cuối cùng: Nhắm mắt lấy đỉnh đầu tiên
                        if (projectionPoint == null && context.Points.TryGetValue(baseVertices[0], out var pFallback)) {
                            projectionPoint = pFallback;
                        }
                    }
                }
            }
        }

        // BƯỚC B: Bắn tia và chốt cao độ (Z) cho đỉnh chóp
        if (projectionPoint != null)
        {
            double height = -1; // Cờ hiệu kiểm tra chiều cao

            // 1. Tìm TÊN của điểm hình chiếu (Nếu trùng đỉnh đáy, VD: "A")
            string projName = "";
            foreach (var kvp in context.Points)
            {
                if (Math.Abs(kvp.Value.X - projectionPoint.X) < 1e-6 && 
                    Math.Abs(kvp.Value.Y - projectionPoint.Y) < 1e-6 && 
                    Math.Abs(kvp.Value.Z - projectionPoint.Z) < 1e-6)
                {
                    projName = kvp.Key;
                    break;
                }
            }

            // 2. TÌM CHIỀU CAO TRỰC TIẾP (Fact "AH", "Chiều cao")
            string expectedEdge1 = $"{apexName}{projName}";
            string expectedEdge2 = $"{projName}{apexName}";

            var heightFact = problem.Facts.FirstOrDefault(f => 
            {
                if (f.Type != FactType.Length) return false;
                var ld = f.GetDataAs<LengthData>();
                if (ld == null || string.IsNullOrEmpty(ld.Target)) return false;
                string t = ld.Target.ToLower();
                return t == expectedEdge1.ToLower() || t == expectedEdge2.ToLower() || t == "height" || t == "chiều cao" || t == "h";
            });

            if (heightFact != null && heightFact.GetDataAs<LengthData>() is LengthData hd && hd.Value != null)
            {
                height = EvaluateExpression(hd.Value, context.UnitLength);
            }

            // ====================================================================
            // 3. SUY LUẬN PYTAGO (Tính chiều cao thông qua Cạnh bên)
            // ====================================================================
            if (height == -1 && baseVertices.Count > 0)
            {
                foreach (string baseNode in baseVertices) {
                    string lateralEdge = $"{apexName}{baseNode}"; 
                    double lateralLength = GetImplicitLength(problem, context, lateralEdge);

                    if (lateralLength > 0 && context.Points.TryGetValue(baseNode, out var baseNodePoint))
                    {
                        double rSquared = Math.Pow(baseNodePoint.X - projectionPoint.X, 2) + Math.Pow(baseNodePoint.Y - projectionPoint.Y, 2) + Math.Pow(baseNodePoint.Z - projectionPoint.Z, 2);
                        double lSquared = Math.Pow(lateralLength, 2);

                        if (lSquared > rSquared)
                        {
                            height = Math.Sqrt(lSquared - rSquared); 
                            Console.WriteLine($"[COMPILER] Suy luận Pytago từ cạnh {lateralEdge}: l={lateralLength:F2}, R={Math.Sqrt(rSquared):F2} -> h={height:F2}");
                            break; 
                        }
                    }
                }
            }

            // 4. Fallback mặc định (Nếu đề không cho bất kỳ độ dài nào)
            if (height == -1) height = context.UnitLength * Math.Sqrt(2);

            // 5. Bắn tia lên trời (Tịnh tiến trục Z)
            context.Points[apexName] = new Point3D(
                projectionPoint.X, 
                projectionPoint.Y, 
                projectionPoint.Z + height 
            );

            // 6. ĐĂNG KÝ CẠNH BÊN
            // 6. ĐĂNG KÝ CẠNH BÊN
            for (int i = 0; i < baseVertices.Count; i++)
            {
                // Cạnh bên
                context.AddGeneratedSegment(apexName, baseVertices[i]);
            }

            Console.WriteLine($"[COMPILER] --- GĐ2: Đã dựng đỉnh {apexName} tại {context.Points[apexName]} ---");
        }
    }



    private void BuildPrismTopBase(GeometryProblemDto problem, CompilationContext context)
    {
        var validPrisms = new[] { ShapeType.Prism, ShapeType.Regular_prism, ShapeType.Cube, ShapeType.Rectangular_cuboid, ShapeType.Parallelepiped, ShapeType.Regular_rectangular_cuboid, ShapeType.Regular_parallelepiped, ShapeType.Regular_cube };
        var solidFact = problem.Facts
            .FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>() is ShapeData sd && validPrisms.Contains(sd.Shape));
        
        if (solidFact == null || solidFact.GetDataAs<ShapeData>() is not ShapeData solidData) return;
        
        string rawTarget = solidData.Target ?? "";
        if (!rawTarget.Contains(".")) return; // Không rõ vế đáy/đỉnh

        string[] parts = rawTarget.Split('.');
        List<string> bottomBase = ParseVertices(parts[0]);
        List<string> topBase = ParseVertices(parts[1]);

        if (bottomBase.Count == 0 || topBase.Count == 0 || bottomBase.Count != topBase.Count) return;

        // Ước tính chiều cao
        double height = -1;
        
        // Dò độ dài cạnh bên trực tiếp (VD: AA')
        string testLateralEdge = $"{topBase[0]}{bottomBase[0]}";
        string testLateralEdge2 = $"{bottomBase[0]}{topBase[0]}";
        
        var heightFact = problem.Facts.FirstOrDefault(f => 
        {
            if (f.Type != FactType.Length) return false;
            var ld = f.GetDataAs<LengthData>();
            if (ld == null || string.IsNullOrEmpty(ld.Target)) return false;
            string t = ld.Target.ToLower();
            return t == testLateralEdge.ToLower() || t == testLateralEdge2.ToLower() || t == "height" || t == "chiều cao" || t == "h" || t == "cc";
        });

        if (heightFact != null && heightFact.GetDataAs<LengthData>() is LengthData hd && hd.Value != null)
        {
            height = EvaluateExpression(hd.Value, context.UnitLength);
        }

        // Bổ sung: Tìm hình chiếu của Đỉnh mặt trên (VD: A' chiếu lên O)
        Point3D? slantTranslation = null;
        var slantFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Projection);
        
        if (slantFact != null && slantFact.GetDataAs<ProjectionData>() is ProjectionData pd)
        {
            // 1. Dò chiều cao từ ProjectFact nếu chưa có (VD: A'O = 6)
            if (height == -1)
            {
                string hEdge1 = $"{pd.From}{pd.Point}";
                string hEdge2 = $"{pd.Point}{pd.From}";
                var hf = problem.Facts.FirstOrDefault(f => f.Type == FactType.Length && 
                        (f.GetDataAs<LengthData>()?.Target == hEdge1 || f.GetDataAs<LengthData>()?.Target == hEdge2));
                if (hf != null && hf.GetDataAs<LengthData>() is LengthData ldh && ldh.Value != null)
                {
                    height = EvaluateExpression(ldh.Value, context.UnitLength);
                }
            }

            // 2. Tính toán Vector tịnh tiến cho lăng trụ xiên
            int topIdx = topBase.IndexOf(pd.From);
            if (topIdx != -1)
            {
                // Tìm tọa độ điểm H (điểm mà From chiếu lên)
                Point3D? hPoint = null;
                if (!string.IsNullOrEmpty(pd.Point) && context.Points.TryGetValue(pd.Point, out var hFound))
                {
                    hPoint = hFound;
                }
                
                if (hPoint != null)
                {
                    // Tọa độ đỉnh mặt trên (pd.From) sẽ là (hPoint.x, hPoint.y, height)
                    // Vậy vector tịnh tiến cho điểm tương ứng ở đáy (bottomBase[topIdx]) là:
                    // Translation = (hPoint.x - bPoint.x, hPoint.y - bPoint.y, height)
                    if (context.Points.TryGetValue(bottomBase[topIdx], out var bPoint))
                    {
                        slantTranslation = new Point3D(
                            hPoint.X - bPoint.X,
                            hPoint.Y - bPoint.Y,
                            height
                        );
                        Console.WriteLine($"[COMPILER] Lăng trụ xiên: {pd.From} chiếu lên {pd.Point}. Vector tịnh tiến = {slantTranslation}");
                    }
                }
            }
        }

        if (height == -1) 
        {
            // Mặc định lăng trụ vuông/lập phương theo đáy, ngược lại thì cao = 1.2 cạnh đáy
            height = solidData.Shape == ShapeType.Cube || solidData.Shape == ShapeType.Regular_cube ? context.UnitLength : context.UnitLength * 1.2;
        }

        var translation = slantTranslation ?? new Point3D(0, 0, height);

        for (int i = 0; i < bottomBase.Count; i++)
        {
            string bVertex = bottomBase[i];
            string tVertex = topBase[i];

            string bNext = bottomBase[(i + 1) % bottomBase.Count];
            string tNext = topBase[(i + 1) % topBase.Count];

            if (context.Points.TryGetValue(bVertex, out var p))
            {
                context.Points[tVertex] = new Point3D(p.X + translation.X, p.Y + translation.Y, p.Z + translation.Z);
                
                // Cạnh bên
                context.AddGeneratedSegment(bVertex, tVertex);
            }
        }
        
        // Đăng ký các cạnh ở đáy trên
        for (int i = 0; i < topBase.Count; i++)
        {
            // Cạnh đáy trên
            context.AddGeneratedSegment(topBase[i], topBase[(i + 1) % topBase.Count]);
        }

        
        Console.WriteLine($"[COMPILER] --- GĐ2: Đã dựng đỉnh mặt trên lăng trụ {string.Join("", topBase)} ---");
    }

    private void BuildVolumePlanes(GeometryProblemDto problem, CompilationContext context)
    {
        foreach (string solidStr in problem.Entities.Solids)
        {
            if (solidStr.Contains("."))
            {
                var parts = solidStr.Split('.');
                var p1 = ParseVertices(parts[0]);
                var p2 = ParseVertices(parts[1]);

                if (p1.Count == 1 && p2.Count >= 3)
                {
                    // Case 1: Pyramid S.ABC...
                    string apex = p1[0];
                    List<string> baseNodes = p2;
                    for (int i = 0; i < baseNodes.Count; i++)
                    {
                        var v1 = baseNodes[i];
                        var v2 = baseNodes[(i + 1) % baseNodes.Count];
                        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { apex, v1, v2 }, Opacity = 0.05 });
                    }
                }
                else if (p1.Count >= 3 && p2.Count >= 3 && p1.Count == p2.Count)
                {
                    // Case 2: Prism ABC.A'B'C'
                    for (int i = 0; i < p1.Count; i++)
                    {
                        var b1 = p1[i];
                        var b2 = p1[(i+1)%p1.Count];
                        var t1 = p2[i];
                        var t2 = p2[(i+1)%p2.Count];
                        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { b1, b2, t2, t1 }, Opacity = 0.05 });
                    }
                    context.GeneratedPlanes.Add(new PlaneData { Points = p2.ToArray(), Opacity = 0.1 });
                }
            }
            else
            {
                var vertices = ParseVertices(solidStr);
                if (vertices.Count == 4)
                {
                    // Case 3: Tetrahedron ABCD
                    string apex = vertices[0];
                    var baseNodes = vertices.Skip(1).ToList();
                    for (int i = 0; i < baseNodes.Count; i++)
                    {
                        var v1 = baseNodes[i];
                        var v2 = baseNodes[(i+1)%baseNodes.Count];
                        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { apex, v1, v2 }, Opacity = 0.05 });
                    }
                    context.GeneratedPlanes.Add(new PlaneData { Points = baseNodes.ToArray(), Opacity = 0.1 });
                }
            }
        }
    }

    private bool CheckIfLateralEdgesAreEqual(GeometryProblemDto problem, string apex, List<string> baseVertices, CompilationContext context)
    {
        var lengths = new List<double>();
        
        // Quét độ dài nối từ Đỉnh đến từng điểm dưới Đáy
        foreach (string v in baseVertices)
        {
            string edge = $"{apex}{v}"; 
            double len = GetImplicitLength(problem, context, edge);
            if (len > 0) lengths.Add(len);
        }

        // Nếu có ít nhất 2 cạnh bên được định nghĩa và chúng bằng nhau (sai số nhỏ hơn 1e-6)
        if (lengths.Count >= 2)
        {
            double firstLen = lengths[0];
            return lengths.All(l => Math.Abs(l - firstLen) < 1e-6);
        }
        
        return false;
    }

    private double GetImplicitLength(GeometryProblemDto problem, CompilationContext context, string edge)
    {
        // 1. Direct length
        var edgeVertices = ParseVertices(edge);
        if (edgeVertices.Count < 2) return -1;

        string v1 = edgeVertices[0];
        string v2 = edgeVertices[1];
        string edgeRev = $"{v2}{v1}";

        var ldFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Length && 
            (f.GetDataAs<LengthData>()?.Target == edge || f.GetDataAs<LengthData>()?.Target == edgeRev));
            
        if (ldFact != null && ldFact.GetDataAs<LengthData>() is LengthData data && data.Value != null) 
        {
            return EvaluateExpression(data.Value, context.UnitLength);
        }

        // 2. Suy luận từ mặt đều (Equilateral)
        var eqFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Shape && 
                     f.GetDataAs<ShapeData>()?.Shape == ShapeType.Equilateral_triangle &&
                     ParseVertices(f.GetDataAs<ShapeData>()?.Target ?? "").Contains(v1) &&
                     ParseVertices(f.GetDataAs<ShapeData>()?.Target ?? "").Contains(v2));

        if (eqFact != null && eqFact.GetDataAs<ShapeData>() is ShapeData eqData)
        {
            string faceName = eqData.Target; 
            var builtPoints = faceName.Where(c => context.Points.ContainsKey(c.ToString())).ToList();
            if (builtPoints.Count >= 2)
            {
                var p1 = context.GetPoint(builtPoints[0].ToString());
                var p2 = context.GetPoint(builtPoints[1].ToString());
                if (p1 != null && p2 != null) return p1.DistanceToPoint(p2);
            }
        }
        return -1;
    }

    private void BuildDependentEntities(GeometryProblemDto problem, CompilationContext context)
    {
        foreach (var fact in problem.Facts)
        {
            var handler = _handlers.FirstOrDefault(h => h.TargetFactType == fact.Type);
            
            if (handler != null)
            {
                handler.Handle(fact, context); 
            }
        }
    }

    private List<string> ParseVertices(string input)
    {
        if (string.IsNullOrEmpty(input)) return new List<string>();
        // Bắt chính xác tên đỉnh (A, B, C, A', A1, A'1)
        var matches = System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*");
        return matches.Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
    }
}
