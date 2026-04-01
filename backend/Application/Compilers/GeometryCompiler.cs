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
        var valid3D = new[] { ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron, ShapeType.Cube, ShapeType.Rectangular_cuboid, ShapeType.Pyramid, ShapeType.Regular_pyramid };

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

        string target = new string(rawTarget.Where(char.IsUpper).ToArray());

        if (target.Length < 3)
        {
            target = (solidFact != null && (solidFact.Shape == ShapeType.Cube || solidFact.Shape == ShapeType.Rectangular_cuboid)) 
                     ? "ABCDEFGH" : "ABCD";
        }

        // 2. TÁCH ĐỈNH - ĐÁY VÀ GHI ĐÈ TÍNH CHẤT (OVERRIDE PROPERTIES)
        string baseTarget = target;
        
        if (solidFact != null)
        {
            if (solidFact.Shape == ShapeType.Pyramid || solidFact.Shape == ShapeType.Regular_pyramid)
            {
                if (target.Length > 3 && target.StartsWith("S")) baseTarget = target.Substring(1); // Cắt S
            }
            else if (solidFact.Shape == ShapeType.Tetrahedron || solidFact.Shape == ShapeType.Regular_tetrahedron)
            {
                if (target.Length >= 4 && baseFact == null) baseTarget = target.Substring(1); 
            }

            if (solidFact.Shape == ShapeType.Regular_tetrahedron) effectiveShape = ShapeType.Equilateral_triangle;
            else if (solidFact.Shape == ShapeType.Cube) effectiveShape = ShapeType.Square;
        }

        // 3. TÍNH TOÁN KÍCH THƯỚC ĐỘNG
        double aValue = context.UnitLength;

        double width = GetDynamicEdgeLength(problem, baseTarget, 0, 1, -1, aValue);
        if (width == -1 && baseTarget.Length >= 4) width = GetDynamicEdgeLength(problem, baseTarget, 2, 3, -1, aValue);
        if (width == -1) width = aValue; 

        double height = GetDynamicEdgeLength(problem, baseTarget, 1, 2, -1, aValue);
        if (height == -1 && baseTarget.Length >= 4) height = GetDynamicEdgeLength(problem, baseTarget, 0, 3, -1, aValue);
        if (height == -1) 
        {
            if (effectiveShape == ShapeType.Rectangle || effectiveShape == ShapeType.Parallelogram) height = width * 2;
            else if (effectiveShape == ShapeType.Triangle) height = width * 1.4; // Tránh cân bằng 
            else height = width; 
        }

        Console.WriteLine($"[COMPILER] Tổng hợp Fact: Tên đáy={baseTarget}, Hình dáng={effectiveShape}");

        if (baseTarget.Length >= 3)
        {
            var edgeLengths = new System.Collections.Generic.List<double>();
            int n = baseTarget.Length;

            // Quét vòng quanh đa giác (VD ABCD: AB, BC, CD, DA)
            for (int i = 0; i < n; i++)
            {
                int nextIndex = (i + 1) % n;
                double l = GetDynamicEdgeLength(problem, baseTarget, i, nextIndex, -1, aValue);
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
                // Thêm Lục giác đều (n=6) vào Enums, chỉ cần thêm 1 dòng "else if (n == 6)" ở đây!
            }
        }

        switch (effectiveShape)
        {
            // ================= NHÓM TỨ GIÁC =================
            case ShapeType.Square:
            case ShapeType.Rectangle: 
                if (baseTarget.Length >= 4) {
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0);      
                    context.Points[baseTarget[1].ToString()] = new Point3D(width, 0, 0);      
                    context.Points[baseTarget[2].ToString()] = new Point3D(width, height, 0);  
                    context.Points[baseTarget[3].ToString()] = new Point3D(0, height, 0);  
                }
                break;

            case ShapeType.Rhombus: // Hình thoi 
            case ShapeType.Parallelogram: // Hình bình hành
                if (baseTarget.Length >= 4) {
                    double b = height; // AD (hoặc BC)
                    double c = width;  // AB
                    if (effectiveShape == ShapeType.Rhombus) b = c; // Hình thoi b = c
                    
                    double diagBD = GetDynamicEdgeLength(problem, baseTarget, 1, 3, -1, aValue); // BD
                    double diagAC = GetDynamicEdgeLength(problem, baseTarget, 0, 2, -1, aValue); // AC
                    double explicitAngleA = GetDynamicAngle(problem, baseTarget, 0, 1, 3); // Cố gắng đọc góc đỉnh Mốc (A)

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
                    
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0);       
                    context.Points[baseTarget[1].ToString()] = new Point3D(c, 0, 0);       
                    context.Points[baseTarget[3].ToString()] = new Point3D(b * cosA, b * sinA, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(c + b * cosA, b * sinA, 0); 
                }
                break;

            case ShapeType.Trapezoid: // Hình thang (Mặc định thang vuông tại góc 0 và 3, đáy nhỏ = 1/2 đáy lớn)
                if (baseTarget.Length >= 4) {
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0);                // Góc vuông
                    context.Points[baseTarget[1].ToString()] = new Point3D(width, 0, 0);            // Đáy lớn
                    context.Points[baseTarget[2].ToString()] = new Point3D(width * 0.5, height, 0); // Đáy nhỏ
                    context.Points[baseTarget[3].ToString()] = new Point3D(0, height, 0);           // Góc vuông
                }
                break;

            // ================= NHÓM TAM GIÁC =================
            case ShapeType.Equilateral_triangle: // Tam giác đều (Các cạnh bằng width)
                if (baseTarget.Length >= 3) {
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[baseTarget[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(width / 2.0, width * Math.Sqrt(3) / 2.0, 0); 
                }
                break;

            case ShapeType.Right_triangle: // Tam giác vuông (Vuông tại đỉnh đầu tiên)
                if (baseTarget.Length >= 3) {
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[baseTarget[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_triangle: // Tam giác cân (Cân tại đỉnh đầu tiên - target[0])
                if (baseTarget.Length >= 3) {                    
                    context.Points[baseTarget[1].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[baseTarget[0].ToString()] = new Point3D(width / 2.0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_right_triangle: // Tam giác vuông cân (Vuông cân tại đỉnh đầu tiên)
                if (baseTarget.Length >= 3) {
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[baseTarget[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(0, width, 0); // Ép height = width
                }
                break;

            case ShapeType.Triangle: 
            default: // Tam giác thường
                if (baseTarget.Length >= 3) {
                    double ac = GetDynamicEdgeLength(problem, baseTarget, 0, 2, -1, aValue);
                    double aLen = height; // BC
                    double cLen = width;  // AB
                    
                    double cosB = 0.3; // Mặc định góc B khoảng 72 độ (cos 0.3) để tránh tam giác đều
                    if (ac > 0) {
                        cosB = (aLen*aLen + cLen*cLen - ac*ac) / (2*aLen*cLen);
                        cosB = Math.Max(-1, Math.Min(1, cosB));
                    }
                    
                    double sinB = Math.Sqrt(1 - cosB*cosB);
                    context.Points[baseTarget[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[baseTarget[1].ToString()] = new Point3D(cLen, 0, 0); 
                    context.Points[baseTarget[2].ToString()] = new Point3D(cLen - aLen * cosB, aLen * sinB, 0); 
                }
                break;
        }

        Console.WriteLine($"[COMPILER] --- GĐ1: Đã dựng {context.Points.Count} điểm mặt đáy ---");
        foreach(var kvp in context.Points) Console.WriteLine($"   -> {kvp.Key}: {kvp.Value}");

        // 3. TỊNH TIẾN TRỌNG TÂM VỀ GỐC TỌA ĐỘ
        if (baseTarget.Length > 0)
        {
            var basePoints = new System.Collections.Generic.List<Point3D>();
            foreach (char c in baseTarget)
            {
                if (context.Points.TryGetValue(c.ToString(), out var p))
                {
                    Console.WriteLine($"[COMPILER] GĐ2: Di chuyển điểm {c} từ {p}");
                    basePoints.Add(p);
                }
            }

            if (basePoints.Count > 0)
            {
                var centroid = Point3D.GetCentroid(basePoints.ToArray());

                foreach (char c in baseTarget)
                {
                    if (context.Points.ContainsKey(c.ToString()))
                    {
                        var p = context.Points[c.ToString()];
                        p.X -= centroid.X;
                        p.Y -= centroid.Y;
                        p.Z -= centroid.Z; 
                    }
                }
            }
        }
    }

    /// <summary>
    /// Hàm trợ giúp: Lấy độ dài cạnh linh hoạt dựa trên vị trí ký tự của Target.
    /// Cho phép tự động dò tìm "AB" hoặc "BA" mà không cần biết chính xác chữ cái là gì.
    /// </summary>
    private double GetDynamicEdgeLength(GeometryProblemDto problem, string target, int idx1, int idx2, double defaultVal, double aValue)
    {
        if (idx1 >= target.Length || idx2 >= target.Length) return defaultVal;

        // Tạo chuỗi cạnh 2 chiều (VD: tìm cả "AB" và "BA")
        string edge1 = $"{target[idx1]}{target[idx2]}"; 
        string edge2 = $"{target[idx2]}{target[idx1]}"; 

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

    private double GetDynamicAngle(GeometryProblemDto problem, string target, int vertexIdx, int adjIdx1, int adjIdx2)
    {
        if (target.Length < 3 || vertexIdx >= target.Length || adjIdx1 >= target.Length || adjIdx2 >= target.Length) return -1;
        
        string vStr = target[vertexIdx].ToString();
        string vAdj1 = target[adjIdx1].ToString();
        string vAdj2 = target[adjIdx2].ToString();
        
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
            if (double.TryParse(data.Value, out double ang)) return ang;
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
        string target = new string(rawTarget.Where(char.IsUpper).ToArray());

        if (target.Length < 4) target = "ABCD";

        string apexChar = target[0].ToString(); 
        string baseTarget = target.Substring(1);
        
        if (solidData.Shape == ShapeType.Pyramid || solidData.Shape == ShapeType.Regular_pyramid)
        {
            if (target.Length > 3 && target.StartsWith("S")) {
                apexChar = "S";
                baseTarget = target.Substring(1);
            }
        }

        if (context.Points.ContainsKey(apexChar)) return;

        Point3D? projectionPoint = null;

        // BƯỚC A: Tìm hình chiếu H
        // Ưu tiên 1: Fact "Hình chiếu" trực tiếp (Projection)
        var projFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Projection);
        if (projFact != null && projFact.GetDataAs<ProjectionData>() is ProjectionData pd && pd.From == apexChar)
        {
            if (!string.IsNullOrEmpty(pd.Point) && context.Points.TryGetValue(pd.Point, out var p)) 
            {
                projectionPoint = p;
                Console.WriteLine($"[COMPILER] Hình chiếu của {apexChar} là {pd.Point} (Từ Fact Projection)");
            }
            
            // Chưa tối ưu
            // Xử lý Fallback: Nếu AI trả về chuỗi thay vì đỉnh ("trọng tâm BCD", hoặc đỉnh bị lỗi point: "S")
            if (projectionPoint == null)
            {
                string textToParse = projFact.RawText.ToLower();
                string targetStr = string.IsNullOrWhiteSpace(pd.Point) || pd.Point.Length <= 1 ? projFact.RawText : pd.Point;
                
                int trongTamIdx = textToParse.IndexOf("trọng tâm");
                if (trongTamIdx >= 0)
                {
                    string subStr = targetStr.Substring(trongTamIdx);
                    // Bắt chính xác tên tam giác sau chữ trọng tâm (ví dụ BCD)
                    var match = System.Text.RegularExpressions.Regex.Match(subStr, @"\b[A-Z]{3}\b");
                    if (!match.Success) match = System.Text.RegularExpressions.Regex.Match(subStr, @"[A-Z]{3}"); // Fallback rủi ro

                    if (match.Success)
                    {
                        var face = match.Value;
                        var pts = face.Where(c => context.Points.ContainsKey(c.ToString()))
                                      .Select(c => context.Points[c.ToString()]).ToArray();
                        if (pts.Length >= 3) 
                        {
                            projectionPoint = Point3D.GetCentroid(pts);
                            string fallbackName = string.IsNullOrWhiteSpace(pd.Point) || pd.Point.Length > 1 ? "H" : pd.Point;
                            context.Points[fallbackName] = projectionPoint;
                            Console.WriteLine($"[COMPILER] Hình chiếu của {apexChar} là Trọng tâm {face} (Đã sinh/dùng điểm {fallbackName})");
                        }
                    }
                }
                
                int trungDiemIdx = textToParse.IndexOf("trung điểm");
                if (projectionPoint == null && trungDiemIdx >= 0)
                {
                    string subStr = targetStr.Substring(trungDiemIdx);
                    var match = System.Text.RegularExpressions.Regex.Match(subStr, @"\b[A-Z]{2}\b");
                    if (!match.Success) match = System.Text.RegularExpressions.Regex.Match(subStr, @"[A-Z]{2}");

                    if (match.Success)
                    {
                        var edge = match.Value;
                        var p1 = context.GetPoint(edge[0].ToString());
                        var p2 = context.GetPoint(edge[1].ToString());
                        if (p1 != null && p2 != null) 
                        {
                            projectionPoint = p1.GetMidpoint(p2);
                            string fallbackName = string.IsNullOrWhiteSpace(pd.Point) || pd.Point.Length > 1 ? "H" : pd.Point;
                            context.Points[fallbackName] = projectionPoint;
                            Console.WriteLine($"[COMPILER] Hình chiếu của {apexChar} là Trung điểm {edge} (Đã sinh/dùng điểm {fallbackName})");
                        }
                    }
                }
            }
        }

        if (projectionPoint == null)
        {
            if (solidData.Shape == ShapeType.Regular_pyramid || solidData.Shape == ShapeType.Regular_tetrahedron)
            {
                var basePoints = new List<Point3D>();
                foreach (char c in baseTarget) if (context.Points.TryGetValue(c.ToString(), out var p)) basePoints.Add(p);
                if (basePoints.Count > 0) projectionPoint = Point3D.GetCentroid(basePoints.ToArray());
            }
            else
            {
                // Tìm theo Fact vuông góc
                var perpFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Perpendicular);
                if (perpFact != null)
                {
                    if (context.Points.TryGetValue(baseTarget[0].ToString(), out var p)) projectionPoint = p;
                }
                else
                {
                    // Suy luận logic: Kiểm tra cạnh bên bằng nhau
                    bool isAllLateralEqual = CheckIfLateralEdgesAreEqual(problem, apexChar, baseTarget, context);

                    if (isAllLateralEqual)
                    {
                        // Nếu các cạnh bên bằng nhau -> Hình chiếu rơi vào Trọng tâm đáy
                        var basePoints = new List<Point3D>();
                        foreach (char c in baseTarget) if (context.Points.TryGetValue(c.ToString(), out var p)) basePoints.Add(p);
                        if (basePoints.Count > 0) projectionPoint = Point3D.GetCentroid(basePoints.ToArray());
                        
                        Console.WriteLine($"[COMPILER] Suy luận: Các cạnh bên bằng nhau -> {apexChar} chiếu xuống Trọng tâm đáy.");
                    }
                    else
                    {
                        // Heuristic: Mặt bên SAB đều và có góc vuông => (SAB) vuông góc đáy => Hình chiếu ở trung điểm AB
                        var eqFace = problem.Facts.FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>()?.Shape == ShapeType.Equilateral_triangle && f.GetDataAs<ShapeData>()?.Target.Contains(apexChar) == true);
                        var angleFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Angle && f.GetDataAs<AngleData>()?.Value == "90");

                        if (eqFace != null && angleFact != null && eqFace.GetDataAs<ShapeData>() is ShapeData shapeData) {
                            string face = shapeData.Target; 
                            var baseP1 = face.FirstOrDefault(c => c != apexChar[0]);
                            var baseP2 = face.LastOrDefault(c => c != apexChar[0]);

                            if (baseP1 != default && baseP2 != default && context.Points.ContainsKey(baseP1.ToString()) && context.Points.ContainsKey(baseP2.ToString())) {
                                var pt1 = context.GetPoint(baseP1.ToString());
                                var pt2 = context.GetPoint(baseP2.ToString());
                                if (pt1 != null && pt2 != null) {
                                    projectionPoint = pt1.GetMidpoint(pt2);
                                    Console.WriteLine($"[COMPILER] Suy luận: Mặt bên {face} đều & vuông góc đáy -> Hình chiếu tại trung điểm {baseP1}{baseP2}.");
                                }
                            }
                        }

                        // Fallback cuối cùng: Nhắm mắt lấy đỉnh đầu tiên
                        if (projectionPoint == null && context.Points.TryGetValue(baseTarget[0].ToString(), out var pFallback)) {
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
            string expectedEdge1 = $"{apexChar}{projName}";
            string expectedEdge2 = $"{projName}{apexChar}";

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
            if (height == -1 && baseTarget.Length > 0)
            {
                foreach (char baseNode in baseTarget) {
                    string lateralEdge = $"{apexChar}{baseNode}"; 
                    double lateralLength = GetImplicitLength(problem, context, lateralEdge);

                    if (lateralLength > 0 && context.Points.TryGetValue(baseNode.ToString(), out var baseNodePoint))
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
            context.Points[apexChar] = new Point3D(
                projectionPoint.X, 
                projectionPoint.Y, 
                projectionPoint.Z + height 
            );

            Console.WriteLine($"[COMPILER] --- GĐ2: Đã dựng đỉnh {apexChar} tại {context.Points[apexChar]} ---");
        }
    }

    private bool CheckIfLateralEdgesAreEqual(GeometryProblemDto problem, string apex, string baseTarget, CompilationContext context)
    {
        var lengths = new List<double>();
        
        // Quét độ dài nối từ Đỉnh đến từng điểm dưới Đáy
        foreach (char c in baseTarget)
        {
            string edge = $"{apex}{c}"; // VD: AB
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
        var ldFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Length && 
            (f.GetDataAs<LengthData>()?.Target == edge || f.GetDataAs<LengthData>()?.Target == new string(edge.Reverse().ToArray())));
            
        if (ldFact != null && ldFact.GetDataAs<LengthData>() is LengthData data && data.Value != null) 
        {
            return EvaluateExpression(data.Value, context.UnitLength);
        }

        // 2. Suy luận từ mặt đều (Equilateral)
        var eqFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Shape && 
                     f.GetDataAs<ShapeData>()?.Shape == ShapeType.Equilateral_triangle &&
                     f.GetDataAs<ShapeData>()?.Target.Contains(edge[0]) == true &&
                     f.GetDataAs<ShapeData>()?.Target.Contains(edge[1]) == true);

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
}
