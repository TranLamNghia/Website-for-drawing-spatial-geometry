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
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;

namespace Application.Compilers;

public class GeometryCompiler : IGeometryCompiler
{
    private readonly IEnumerable<IFactHandler> _handlers;
    private readonly FactValidationEngine _validationEngine;
    private readonly QueryProcessingEngine _queryEngine;

    public GeometryCompiler(
        IEnumerable<IFactHandler> handlers,
        FactValidationEngine validationEngine,
        QueryProcessingEngine queryEngine)
    {
        _handlers = handlers;
        _validationEngine = validationEngine;
        _queryEngine = queryEngine;
    }

    public CompilationContext Compile(GeometryProblemDto problem)
    {
        // Khởi tạo cuốn sổ tay trắng
        var context = new CompilationContext();
        context.IdentityPoints = new HashSet<string>(problem.Entities.Points.Select(p => p.ToUpper()));
        context.Sections = new List<SectionDataDto>(problem.Entities.Sections);
        context.SourceFacts = problem.Facts.ToList();

        // NẠP TỌA ĐỘ CÓ SẴN (Nếu có, vd: từ api/process1 hoặc AI Fallback)
        if (problem.Points != null)
        {
            foreach (var kvp in problem.Points)
            {
                context.Points[kvp.Key] = new Point3D(kvp.Value.X, kvp.Value.Y, kvp.Value.Z);
            }
        }

        // Giai đoạn 1: Dựng móng nhà (Mặt đáy nằm trên mp z = 0)
        BuildBase(problem, context);

        // Giai đoạn 1.25: Dựng scaffold tối thiểu từ entities (đoạn thẳng, giao điểm, mặt phẳng...)
        EntityScaffoldBuilder.Build(problem, context);

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

        // Giai đoạn 3.5: Hợp nhất các điểm trùng tọa độ (VD: O trùng G trong tam giác đều)
        MergePoints(problem, context);

        // Giai đoạn 3.7: Xử lý Cross-Section từ Queries (VD: "cross_section_S.ABCD_MNP")
        ProcessCrossSectionQueries(problem, context);

        // Giai đoạn 3.8: Chỉ nâng theo trục Z nếu hình bị chui xuống dưới mặt phẳng z=0
        NormalizeSceneToPositiveQuadrant(context);

        // Bỏ đoạn tự sửa tên điểm descriptiveKeys theo ý kiến người dùng để giữ nguyên điểm AI trả về

        // Xóa bỏ phần thập phân nhỏ hơn 1e-10
        foreach (var key in context.Points.Keys.ToList())
        {
            var p = context.Points[key];
            p.X = Math.Abs(p.X) < 1e-10 ? 0 : Math.Round(p.X, 4);
            p.Y = Math.Abs(p.Y) < 1e-10 ? 0 : Math.Round(p.Y, 4);
            p.Z = Math.Abs(p.Z) < 1e-10 ? 0 : Math.Round(p.Z, 4);
        }

        PlacePerpendicularFootPoints(problem, context, overwrite: true);

        // Giai đoạn 4: KIỂM ĐỊNH NGƯỢC (Validation)
        // Dùng tọa độ vừa dựng để kiểm tra ngược lại từng Fact (Diện tích, Độ dài, Góc...)
        context.ValidationReport = _validationEngine.Validate(problem, context);

        // Giai đoạn 4.5: Xử lý và kiểm định các query nâng cao (đợt 5)
        context.QueryValidationReport = _queryEngine.Process(problem, context);

        // Giai đoạn 5: Tính Side cho từng điểm so với mặt phẳng cắt (Cross-section)
        ComputePointSides(context);

        return context;
    }

    public void RefineWithNewPoints(CompilationContext context, GeometryProblemDto problem, MathSolverResponseDto response)
    {
        if (response.Points != null && response.Points.Count > 0)
        {
            Console.WriteLine($"[COMPILER] Mở khóa sức mạnh AI Fallback! Đang sáp nhập {response.Points.Count} điểm mới vào hệ thống...");

            var fixedPointNames = new HashSet<string>(
                problem.Points?.Keys ?? Enumerable.Empty<string>(),
                StringComparer.OrdinalIgnoreCase
            );

            // Điểm hợp lệ để vẽ = điểm đã khai báo trong entities.points.
            // SymPy đôi khi trả thêm điểm phụ (vd gốc O từ "(Oxy)") không khai báo;
            // không nạp các điểm này để tránh "điểm thừa" làm sai pointIntegrity.
            var declaredNames = new HashSet<string>(
                problem.Entities.Points.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p.Trim()),
                StringComparer.OrdinalIgnoreCase
            );

            // Ghi đè tọa độ
            foreach (var kvp in response.Points)
            {
                if (fixedPointNames.Contains(kvp.Key))
                {
                    Console.WriteLine($"[COMPILER] Bỏ qua ghi đè điểm cố định {kvp.Key} từ đề bài.");
                    continue;
                }

                if (context.Points.ContainsKey(kvp.Key))
                {
                    context.Points[kvp.Key] = kvp.Value;
                }
                else if (declaredNames.Contains(kvp.Key))
                {
                    context.Points.Add(kvp.Key, kvp.Value);
                }
                else
                {
                    Console.WriteLine($"[COMPILER] Bỏ qua điểm phụ '{kvp.Key}' do SymPy sinh thêm (không khai báo trong entities.points).");
                }
            }
        }

        if (response.Sections != null && response.Sections.Count > 0)
        {
            Console.WriteLine($"[COMPILER] Nhận được {response.Sections.Count} thiết diện từ AI. Đang sáp nhập...");
            context.Sections.AddRange(response.Sections);
        }

        // Chạy lại hàm dựng điểm phụ (trung điểm, trọng tâm...) để các đỉnh AI sinh ra tạo ra trung điểm / giao điểm chuẩn
        BuildDependentEntities(problem, context);

        // Chạy lại kiểm định vòng 2
        context.ValidationReport = _validationEngine.Validate(problem, context);
        context.QueryValidationReport = _queryEngine.Process(problem, context);

        // Tính lại Side cho cross-section
        ComputePointSides(context);
        
        Console.WriteLine($"[COMPILER] Fallback hoàn tất. Kết quả Re-Validation: AllPassed = {context.ValidationReport.AllPassed}");
    }

    /// <summary>
    /// Giai đoạn 1: Đọc Fact "shape" và dựng tọa độ mặt đáy (z = 0)
    /// </summary>
    private void BuildBase(GeometryProblemDto problem, CompilationContext context)
    {
        var valid2D = new[] { ShapeType.Square, ShapeType.Rectangle, ShapeType.Rhombus, ShapeType.Parallelogram, ShapeType.Trapezoid, ShapeType.Triangle, ShapeType.Equilateral_triangle, ShapeType.Right_triangle, ShapeType.Isosceles_triangle, ShapeType.Isosceles_right_triangle, ShapeType.Pentagon, ShapeType.Hexagon };
        var valid3D = new[] { ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron, ShapeType.Cube, ShapeType.Regular_cube, ShapeType.Rectangular_cuboid, ShapeType.Regular_rectangular_cuboid, ShapeType.Pyramid, ShapeType.Regular_pyramid, ShapeType.Prism, ShapeType.Regular_prism, ShapeType.Parallelepiped, ShapeType.Regular_parallelepiped, ShapeType.Cone, ShapeType.Regular_cone, ShapeType.Cylinder, ShapeType.Regular_cylinder, ShapeType.Frustum, ShapeType.Pentagonal_pyramid, ShapeType.Hexagonal_pyramid, ShapeType.Pentagonal_prism, ShapeType.Hexagonal_prism };
        var validRoundShapes = new[] { ShapeType.Cone, ShapeType.Regular_cone, ShapeType.Cylinder, ShapeType.Regular_cylinder };

        var shapeFacts = problem.Facts
            .Where(f => f.Type == FactType.Shape)
            .Select(f => f.GetDataAs<ShapeData>())
            .Where(d => d != null)
            .ToList();
                
        var baseFact = shapeFacts.FirstOrDefault(d => d != null && valid2D.Contains(d.Shape));
        var solidFact = shapeFacts.FirstOrDefault(d => d != null && valid3D.Contains(d.Shape));

        if (baseFact == null && solidFact == null)
        {
            TryBuildCartesianBase(problem, context);
            return;
        }

        // Hình nón/trụ: Không có mặt đáy đa giác, thoát sớm (ShapeHandler đã xử lý)
        if (solidFact != null && validRoundShapes.Contains(solidFact.Shape))
        {
            Console.WriteLine($"[COMPILER] Phát hiện khối tròn xoay ({solidFact.Shape}). Bỏ qua BuildBase đa giác.");
            return;
        }

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
            if (solidFact.Shape == ShapeType.Pyramid || solidFact.Shape == ShapeType.Regular_pyramid
                || solidFact.Shape == ShapeType.Pentagonal_pyramid || solidFact.Shape == ShapeType.Hexagonal_pyramid)
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
            else if (solidFact.Shape == ShapeType.Prism || solidFact.Shape == ShapeType.Regular_prism
                || solidFact.Shape == ShapeType.Cube || solidFact.Shape == ShapeType.Regular_cube
                || solidFact.Shape == ShapeType.Rectangular_cuboid || solidFact.Shape == ShapeType.Regular_rectangular_cuboid
                || solidFact.Shape == ShapeType.Parallelepiped || solidFact.Shape == ShapeType.Regular_parallelepiped
                || solidFact.Shape == ShapeType.Pentagonal_prism || solidFact.Shape == ShapeType.Hexagonal_prism)
            {
                // Hình lăng trụ ABC.A'B'C' -> Đáy là ABC
                if (rawTarget.Contains(".")) {
                    baseVertices = ParseVertices(rawTarget.Split('.')[0]);
                } else if (baseVertices.Count >= 6) {
                    baseVertices = baseVertices.Take(baseVertices.Count / 2).ToList();
                }
            }
        }

        if (solidFact != null && baseFact == null)
        {
            effectiveShape = ShapeBuildHelper.ResolveSolidBaseShape(solidFact.Shape);
        }

        if (baseVertices.Count < 3)
        {
             // Fallback
             if (solidFact != null && (solidFact.Shape == ShapeType.Pentagonal_pyramid || solidFact.Shape == ShapeType.Pentagonal_prism))
                 baseVertices = new List<string> { "A", "B", "C", "D", "E" };
             else if (solidFact != null && (solidFact.Shape == ShapeType.Hexagonal_pyramid || solidFact.Shape == ShapeType.Hexagonal_prism))
                 baseVertices = new List<string> { "A", "B", "C", "D", "E", "F" };
             else
                 baseVertices = (solidFact != null && (solidFact.Shape == ShapeType.Cube || solidFact.Shape == ShapeType.Regular_cube || solidFact.Shape == ShapeType.Rectangular_cuboid || solidFact.Shape == ShapeType.Regular_rectangular_cuboid)) 
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
            else if (effectiveShape == ShapeType.Right_triangle) height = width * 1.35;
            else if (effectiveShape == ShapeType.Isosceles_right_triangle) height = width;
            else if (effectiveShape == ShapeType.Triangle) height = width * 1.4;
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

            // Chỉ nâng lên đa giác đều khi đề khai báo rõ — không suy diễn từ cạnh bằng nhau mặc định.
            if (edgeLengths.Count == n && edgeLengths.All(l => Math.Abs(l - edgeLengths[0]) < 1e-6))
            {
                if (n == 4)
                {
                    if (effectiveShape != ShapeType.Square) 
                    {
                        effectiveShape = ShapeType.Rhombus;
                    }
                    width = edgeLengths[0];
                }
            }
        }

        if (baseVertices.Count == 3 && TriangleBuildHelper.IsTriangleShape(effectiveShape))
        {
            var trianglePlacement = TriangleBuildHelper.ResolvePlacement(
                problem, effectiveShape, baseVertices, aValue, width, height);
            effectiveShape = trianglePlacement.Shape;
            TriangleBuildHelper.Place(context.Points, baseVertices, trianglePlacement);
        }
        else
        {
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
            case ShapeType.Right_triangle: 
            case ShapeType.Isosceles_triangle: 
            case ShapeType.Isosceles_right_triangle:
            case ShapeType.Triangle:
                break;

            case ShapeType.Pentagon:
            case ShapeType.Hexagon:
                if (baseVertices.Count >= (effectiveShape == ShapeType.Pentagon ? 5 : 6))
                {
                    ShapeBuildHelper.PlaceRegularPolygon(context.Points, baseVertices, width);
                }
                break;

            default: 
                if (baseVertices.Count >= 3 && !TriangleBuildHelper.IsTriangleShape(effectiveShape)) {
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

        PlacePerpendicularFootPoints(problem, context);
    }

    private static void PlacePerpendicularFootPoints(GeometryProblemDto problem, CompilationContext context, bool overwrite = false)
    {
        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Perpendicular))
        {
            var data = fact.GetDataAs<ObjectsData>();
            if (data?.Objects == null || data.Objects.Count < 2) continue;

            string seg1 = data.Objects[0];
            string seg2 = data.Objects[1];
            if (seg1.Length != 2 || seg2.Length != 2) continue;

            string from = seg1[0].ToString();
            string to = seg1[1].ToString();
            if (!overwrite && context.Points.ContainsKey(to)) continue;

            var fromPt = context.GetPoint(from);
            var line = context.GetLine(seg2);
            if (fromPt == null || line == null) continue;

            context.Points[to] = line.GetProjection(fromPt);
            context.AddGeneratedSegment(from, to);
            Console.WriteLine($"[COMPILER] Chân vuông góc {to} trên {seg2} từ {from}: {context.Points[to]}");
        }
    }

    private void TryBuildCartesianBase(GeometryProblemDto problem, CompilationContext context)
    {
        var perpFacts = problem.Facts.Where(f => f.Type == FactType.Perpendicular).Select(f => f.GetDataAs<ObjectsData>()).Where(d => d != null && d.Objects != null && d.Objects.Count >= 2).ToList();
        
        var segments = new HashSet<string>();
        foreach (var fact in perpFacts)
        {
            if (fact?.Objects != null && fact.Objects.Count >= 2 && fact.Objects[0].Length == 2 && fact.Objects[1].Length == 2)
            {
                segments.Add(fact.Objects[0]);
                segments.Add(fact.Objects[1]);
            }
        }
        
        var pointsCount = new Dictionary<char, int>();
        foreach (var seg in segments)
        {
            foreach (char c in seg)
            {
                if (!pointsCount.ContainsKey(c)) pointsCount[c] = 0;
                pointsCount[c]++;
            }
        }
        
        if (pointsCount.Count == 0) return;

        var originKvp = pointsCount.OrderByDescending(kvp => kvp.Value).FirstOrDefault();
        if (originKvp.Value >= 3)
        {
            string origin = originKvp.Key.ToString();
            var branches = segments.Where(s => s.Contains(origin)).Select(s => s.Replace(origin, "")).Distinct().ToList();
            if (branches.Count >= 3)
            {
                context.Points[origin] = new Point3D(0, 0, 0);
                double aValue = context.UnitLength;
                
                context.Points[branches[0]] = new Point3D(aValue, 0, 0);
                context.Points[branches[1]] = new Point3D(0, aValue, 0);
                context.Points[branches[2]] = new Point3D(0, 0, aValue);

                context.AddGeneratedSegment(origin, branches[0]);
                context.AddGeneratedSegment(origin, branches[1]);
                context.AddGeneratedSegment(origin, branches[2]);

                Console.WriteLine($"[COMPILER] Fallback: Dựng hệ trục tọa độ tại {origin} với các tia {origin}{branches[0]}, {origin}{branches[1]}, {origin}{branches[2]}");
            }
        }
    }

    private void NormalizeSceneToPositiveQuadrant(CompilationContext context, double margin = 0.0)
    {
        if (context.Points.Count == 0) return;

        double minZ = double.PositiveInfinity;

        foreach (var point in context.Points.Values)
        {
            if (point.Z < minZ) minZ = point.Z;
        }

        double shiftZ = minZ < margin ? margin - minZ : 0;

        if (Math.Abs(shiftZ) < 1e-10)
            return;

        foreach (var point in context.Points.Values)
        {
            point.Z = Math.Round(point.Z + shiftZ, 4);
        }

        Console.WriteLine($"[COMPILER] Dịch hình theo trục Z với offset (0, 0, {shiftZ:0.###}).");
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
        var valid3D = new[] { ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron, ShapeType.Pyramid, ShapeType.Regular_pyramid, ShapeType.Cone, ShapeType.Regular_cone, ShapeType.Pentagonal_pyramid, ShapeType.Hexagonal_pyramid };
        var solidFact = problem.Facts
            .FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>() is ShapeData sd && valid3D.Contains(sd.Shape));
        
        if (solidFact == null || solidFact.GetDataAs<ShapeData>() is not ShapeData solidData) return;
        
        string rawTarget = solidData.Target ?? "";

        // Hình nón: Tính tọa độ đỉnh S dựa trên tâm O và chiều cao
        if (solidData.Shape == ShapeType.Cone || solidData.Shape == ShapeType.Regular_cone)
        {
            string centerName = string.IsNullOrEmpty(solidData.Center) ? "O" : solidData.Center;
            string coneApexName = string.IsNullOrEmpty(solidData.Apex) ? "S" : solidData.Apex;
            double h = -1;
            if (!string.IsNullOrEmpty(solidData.Height) && double.TryParse(solidData.Height, out double val)) h = val;
            if (h == -1) h = context.UnitLength * 1.5; // Default height

            if (context.Points.TryGetValue(centerName, out var bP))
            {
                context.Points[coneApexName] = new Point3D(bP.X, bP.Y, bP.Z + h);
                Console.WriteLine($"[COMPILER] Dựng đỉnh nón {coneApexName} tại {context.Points[coneApexName]}");
            }
            return;
        }

        List<string> allVertices = ParseVertices(rawTarget);
        if (allVertices.Count < 4) 
        {
            // Fallback nếu trích xuất lỗi
            allVertices = new List<string> { "S", "A", "B", "C" };
        }

        string apexName = allVertices[0]; 
        List<string> baseVertices = allVertices.Skip(1).ToList();
        
        if (context.Points.TryGetValue(apexName, out var existingApex))
        {
            var basePtsForCheck = baseVertices
                .Where(v => context.Points.ContainsKey(v))
                .Select(v => context.Points[v])
                .ToList();

            if (basePtsForCheck.Count > 0)
            {
                double baseZ = basePtsForCheck.Average(p => p.Z);
                if (existingApex.Z <= baseZ + 0.05)
                    context.Points.Remove(apexName);
                else
                    return;
            }
            else
            {
                return;
            }
        }

        Point3D? projectionPoint = null;

        // BƯỚC A: Tìm hình chiếu H
        // Ưu tiên 1: Fact "Hình chiếu" trực tiếp (Projection)
        var projFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Projection);
        if (projFact != null && projFact.GetDataAs<ProjectionData>() is ProjectionData pd && pd.From == apexName)
        {
            if (!string.IsNullOrEmpty(pd.Point) && context.Points.TryGetValue(pd.Point, out var existingProj))
            {
                projectionPoint = existingProj;
                Console.WriteLine($"[COMPILER] Hình chiếu của {apexName} là {pd.Point} (đã có sẵn)");
            }
            else if (!string.IsNullOrWhiteSpace(pd.Onto))
            {
                var basePts = baseVertices
                    .Where(v => context.Points.ContainsKey(v))
                    .Select(v => context.Points[v])
                    .ToArray();

                if (basePts.Length >= 3)
                {
                    var centroid = Point3D.GetCentroid(basePts);
                    projectionPoint = ShapeBuildHelper.OffsetProjectionFoot(centroid, basePts, 0.3);

                    if (!string.IsNullOrEmpty(pd.Point) && !context.Points.ContainsKey(pd.Point))
                    {
                        context.Points[pd.Point] = projectionPoint;
                        Console.WriteLine($"[COMPILER] Sinh hình chiếu {pd.Point} của {apexName} lên {pd.Onto} (lệch 30% từ trọng tâm đáy)");
                    }
                }
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
                var pts = baseVertices.Where(v => context.Points.ContainsKey(v))
                                      .Select(v => context.Points[v]).ToArray();

                bool isAllLateralEqual = CheckIfLateralEdgesAreEqual(problem, apexName, baseVertices, context);

                if (isAllLateralEqual && pts.Length >= 3)
                {
                    projectionPoint = Point3D.GetCentroid(pts);
                    Console.WriteLine($"[COMPILER] Suy luận: Các cạnh bên bằng nhau -> {apexName} chiếu xuống trọng tâm đáy.");
                }
                else if (pts.Length >= 3)
                {
                    var centroid = Point3D.GetCentroid(pts);
                    projectionPoint = ShapeBuildHelper.OffsetProjectionFoot(centroid, pts, 0.3);
                    Console.WriteLine($"[COMPILER] Chóp thường -> chân đường cao lệch 30% từ trọng tâm đáy.");
                }

                var eqFaceFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>()?.Shape == ShapeType.Equilateral_triangle && f.GetDataAs<ShapeData>()?.Target.Contains(apexName) == true);
                var angleFact = problem.Facts.FirstOrDefault(f => f.Type == FactType.Angle && f.GetDataAs<AngleData>()?.Value == "90");

                if (eqFaceFact != null && angleFact != null && eqFaceFact.GetDataAs<ShapeData>() is ShapeData faceData)
                {
                    var faceVertices = ParseVertices(faceData.Target);
                    var sidePoints = faceVertices.Where(v => v != apexName).ToList();

                    if (sidePoints.Count >= 2 && context.Points.ContainsKey(sidePoints[0]) && context.Points.ContainsKey(sidePoints[1]))
                    {
                        var pt1 = context.GetPoint(sidePoints[0]);
                        var pt2 = context.GetPoint(sidePoints[1]);
                        if (pt1 != null && pt2 != null)
                        {
                            projectionPoint = pt1.GetMidpoint(pt2);
                            Console.WriteLine($"[COMPILER] Suy luận: Mặt bên {faceData.Target} đều & vuông góc đáy -> hình chiếu tại trung điểm {sidePoints[0]}{sidePoints[1]}.");
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
        var validPrisms = new[] { ShapeType.Prism, ShapeType.Regular_prism, ShapeType.Cube, ShapeType.Rectangular_cuboid, ShapeType.Parallelepiped, ShapeType.Regular_rectangular_cuboid, ShapeType.Regular_parallelepiped, ShapeType.Regular_cube, ShapeType.Cylinder, ShapeType.Regular_cylinder, ShapeType.Pentagonal_prism, ShapeType.Hexagonal_prism, ShapeType.Frustum };
        var solidFact = problem.Facts
            .FirstOrDefault(f => f.Type == FactType.Shape && f.GetDataAs<ShapeData>() is ShapeData sd && validPrisms.Contains(sd.Shape));
        
        if (solidFact == null || solidFact.GetDataAs<ShapeData>() is not ShapeData solidData) return;
        
        string rawTarget = solidData.Target ?? "";

        // Hình trụ: Tính tọa độ tâm trên O' dựa trên tâm dưới O và chiều cao
        if (solidData.Shape == ShapeType.Cylinder || solidData.Shape == ShapeType.Regular_cylinder)
        {
            string centerBottomName = string.IsNullOrEmpty(solidData.Center) ? "O" : solidData.Center;
            string centerTopName = centerBottomName + "'";
            double h = -1;
            if (!string.IsNullOrEmpty(solidData.Height) && double.TryParse(solidData.Height, out double val)) h = val;
            if (h == -1) h = context.UnitLength * 1.5; // Default height

            if (context.Points.TryGetValue(centerBottomName, out var bP))
            {
                context.Points[centerTopName] = new Point3D(bP.X, bP.Y, bP.Z + h);
                Console.WriteLine($"[COMPILER] Dựng tâm đáy trên hình trụ {centerTopName} tại {context.Points[centerTopName]}");
            }
            return;
        }

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

        // Find bottom center for scaling
        Point3D centerBottom = new Point3D(0, 0, 0);
        int validBases = 0;
        foreach (var bv in bottomBase) {
            if (context.Points.TryGetValue(bv, out var bp)) {
                centerBottom.X += bp.X; centerBottom.Y += bp.Y; centerBottom.Z += bp.Z;
                validBases++;
            }
        }
        if (validBases > 0) {
            centerBottom.X /= validBases; centerBottom.Y /= validBases; centerBottom.Z /= validBases;
        }

        double scale = (solidData.Shape == ShapeType.Frustum) ? 0.6 : 1.0;

        for (int i = 0; i < bottomBase.Count; i++)
        {
            string bVertex = bottomBase[i];
            string tVertex = topBase[i];

            if (context.Points.TryGetValue(bVertex, out var p))
            {
                // Scale relative to center
                double scaledX = centerBottom.X + (p.X - centerBottom.X) * scale;
                double scaledY = centerBottom.Y + (p.Y - centerBottom.Y) * scale;

                context.Points[tVertex] = new Point3D(scaledX + translation.X, scaledY + translation.Y, p.Z + translation.Z);
                
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
                    context.GeneratedPlanes.Add(new PlaneData { Points = baseNodes.ToArray(), Opacity = 0.1 });
                }
                else if (p1.Count >= 3 && p2.Count >= 3 && p1.Count == p2.Count)
                {
                    // Case 2: Prism/Frustum ABC.A'B'C'
                    for (int i = 0; i < p1.Count; i++)
                    {
                        var b1 = p1[i];
                        var b2 = p1[(i+1)%p1.Count];
                        var t1 = p2[i];
                        var t2 = p2[(i+1)%p2.Count];
                        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { b1, b2, t2, t1 }, Opacity = 0.05 });
                    }
                    context.GeneratedPlanes.Add(new PlaneData { Points = p1.ToArray(), Opacity = 0.1 });
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

    private void MergePoints(GeometryProblemDto problem, CompilationContext context)
    {
        // 1. Chỉ hợp nhất các điểm KHÔNG nằm trong danh sách thực thể chính (identity points)
        // Hoặc chỉ hợp nhất nếu chúng thực sự trùng tọa độ 100%
        var identityPoints = new HashSet<string>(problem.Entities.Points.Select(p => p.ToUpper()));
        
        var priorityList = problem.Entities.Points.ToList();
        var keys = context.Points.Keys.OrderBy(k => {
            int idx = priorityList.IndexOf(k);
            return idx == -1 ? 999 : idx;
        }).ToList();

        var merged = new HashSet<string>();

        for (int i = 0; i < keys.Count; i++)
        {
            string pPrimary = keys[i];
            if (merged.Contains(pPrimary)) continue;
            if (!context.Points.TryGetValue(pPrimary, out var pos1)) continue;

            for (int j = i + 1; j < keys.Count; j++)
            {
                string pSecondary = keys[j];
                if (merged.Contains(pSecondary)) continue;
                
                // NGUYÊN TẮC VÀNG: Không bao giờ hợp nhất 2 điểm định danh (A, B, C, G...)
                if (identityPoints.Contains(pSecondary.ToUpper()) && identityPoints.Contains(pPrimary.ToUpper()))
                    continue;

                if (!context.Points.TryGetValue(pSecondary, out var pos2)) continue;

                if (pos1.DistanceToPoint(pos2) < 1e-4)
                {
                    Console.WriteLine($"[COMPILER] Hợp nhất điểm dư thừa: {pSecondary} -> {pPrimary}");
                    context.ReplacePointReference(pSecondary, pPrimary);
                    context.Points.Remove(pSecondary);
                    merged.Add(pSecondary);
                }
            }
        }
    }

    /// <summary>
    /// Phát hiện các query chứa "cross_section" và tự động tính thiết diện.
    /// Format target: "cross_section_S.ABCD_MNP" → solid=S.ABCD, plane=MNP
    /// </summary>
    private void ProcessCrossSectionQueries(GeometryProblemDto problem, CompilationContext context)
    {
        var targetsToProcess = new List<(string solid, string plane)>();
        string defaultSolid = problem.Entities.Solids.FirstOrDefault() ?? "";

        // Nếu không có khối đa diện nhưng có mặt cầu, dùng "sphere" làm khối mặc định
        if (string.IsNullOrEmpty(defaultSolid) && context.Spheres.Count > 0)
        {
            defaultSolid = "sphere";
        }

        // Tự động thêm các mặt phẳng cắt (nếu có)
        if (!string.IsNullOrEmpty(defaultSolid) && problem.Entities.Planes.Count > 0)
        {
            foreach (var pStr in problem.Entities.Planes)
            {
                // Chỉ thêm nếu không phải là một mặt của khối đa diện (vùng biên)
                if (!IsFaceOfSolid(pStr, context))
                {
                    targetsToProcess.Add((defaultSolid, pStr));
                }
            }
        }

        foreach (var query in problem.Queries)
        {
            string target = "";
            try
            {
                if (query.Data.ValueKind == System.Text.Json.JsonValueKind.Object &&
                    query.Data.TryGetProperty("target", out var targetProp))
                {
                    target = targetProp.GetString() ?? "";
                }
            }
            catch { continue; }

            if (!target.StartsWith("cross_section", StringComparison.OrdinalIgnoreCase))
            {
                if (query.Type == Application.DTOs.Enums.QueryType.shape || query.Type == Application.DTOs.Enums.QueryType.intersection_line)
                {
                    var sSolid = query.Data.TryGetProperty("solid", out var top) ? top.GetString() : "";
                    var sPlane = query.Data.TryGetProperty("plane", out var pl) ? pl.GetString() : "";
                    var sSurface = query.Data.TryGetProperty("surface", out var sf) ? sf.GetString() : "";
                    
                    if (string.IsNullOrEmpty(sSolid) && query.Data.TryGetProperty("target", out var tg)) sSolid = tg.GetString();
                    if (string.IsNullOrEmpty(sSolid) && problem.Entities.Solids.Count > 0) sSolid = problem.Entities.Solids[0];
                    
                    if (string.IsNullOrEmpty(sPlane)) sPlane = sSurface;
                    if (string.IsNullOrEmpty(sPlane) && query.Data.TryGetProperty("cuttingPlane", out var cp))
                    {
                        if (cp.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            sPlane = string.Join("", cp.EnumerateArray().Select(x => x.GetString()));
                        }
                    }

                    if (!string.IsNullOrEmpty(sSolid) && !string.IsNullOrEmpty(sPlane))
                    {
                        target = $"cross_section_{sSolid}_{sPlane}";
                    }
                }
            }
            if (target.StartsWith("cross_section", StringComparison.OrdinalIgnoreCase))
            {
                var afterPrefix = target.Substring("cross_section_".Length); // "S.ABCD_MNP"
                string solidStr = "";
                string planeStr = "";
                
                int firstSep = afterPrefix.IndexOf('_');
                if (firstSep > 0)
                {
                    string part1 = afterPrefix.Substring(0, firstSep);
                    string part2 = afterPrefix.Substring(firstSep + 1);

                    if (part1.Contains(".") || (problem.Entities.Solids.Contains(part1) && !part2.Contains(".")))
                    {
                        solidStr = part1; planeStr = part2;
                    }
                    else if (part2.Contains(".") || problem.Entities.Solids.Contains(part2))
                    {
                        solidStr = part2; planeStr = part1;
                    }
                    else
                    {
                        solidStr = part1; planeStr = part2;
                    }
                }
                else
                {
                    planeStr = afterPrefix;
                    if (problem.Entities.Solids.Count > 0) solidStr = problem.Entities.Solids[0];
                }

                if (!string.IsNullOrEmpty(solidStr) && !string.IsNullOrEmpty(planeStr))
                {
                    targetsToProcess.Add((solidStr, planeStr));
                }
            }
        }

        targetsToProcess = targetsToProcess.Distinct().ToList();

        foreach (var (solidStr, planeStr) in targetsToProcess)
        {
            Console.WriteLine($"[COMPILER] Cross-Section: Khối={solidStr}, Mp cắt={planeStr}");

            // Lấy 3 điểm đầu tiên của mặt phẳng cắt
            var planeVertices = ParseVertices(planeStr);

            Domains.MathCore.Plane3D plane;

            if (planeVertices.Count >= 3)
            {
                var p1 = context.GetPoint(planeVertices[0]);
                var p2 = context.GetPoint(planeVertices[1]);
                var p3 = context.GetPoint(planeVertices[2]);
                if (p1 == null || p2 == null || p3 == null)
                {
                    Console.WriteLine($"[COMPILER] Thiếu tọa độ cho các đỉnh mặt phẳng cắt: {planeStr}");
                    continue;
                }
                try { plane = new Domains.MathCore.Plane3D(p1, p2, p3); }
                catch { Console.WriteLine($"[COMPILER] 3 điểm {planeStr} thẳng hàng, không tạo được mp"); continue; }
            }
            else if (context.Spheres.Count > 0)
            {
                // Mặt phẳng được đặt tên (P), (Q), (R)... đi qua tâm mặt cầu và đôi một vuông góc
                // Tự động sinh 3 mặt phẳng tọa độ chuẩn (OXY, OXZ, OYZ) qua tâm cầu
                var sphere = context.Spheres.First();
                var center = context.GetPoint(sphere.Center);
                if (center == null) { Console.WriteLine($"[COMPILER] Không tìm thấy tâm mặt cầu"); continue; }

                // Xác định thứ tự mặt phẳng này trong danh sách targetsToProcess
                int planeIndex = targetsToProcess.IndexOf((solidStr, planeStr));
                // Lấy thứ tự duy nhất dựa trên tên mặt phẳng
                int uniqueIdx = 0;
                var allPlaneNames = targetsToProcess.Select(t => t.plane).Distinct().ToList();
                uniqueIdx = allPlaneNames.IndexOf(planeStr);

                double[][] normals = { new[] { 1.0, 0, 0 }, new[] { 0, 1.0, 0 }, new[] { 0, 0, 1.0 } };
                var n = normals[uniqueIdx % 3];

                // Ax + By + Cz + D = 0, với (x0,y0,z0) là tâm cầu
                double D = -(n[0] * center.X + n[1] * center.Y + n[2] * center.Z);
                plane = new Domains.MathCore.Plane3D(n[0], n[1], n[2], D);

                Console.WriteLine($"[COMPILER] Tự sinh mặt phẳng chuẩn #{uniqueIdx} cho mặt cầu: {n[0]}x + {n[1]}y + {n[2]}z + {D} = 0");
            }
            else
            {
                Console.WriteLine($"[COMPILER] Mp cắt cần ít nhất 3 điểm, chỉ có {planeVertices.Count}");
                continue;
            }

            // === GIẢI TÍCH MẶT CẦU: Kiểm tra nếu đang cắt mặt cầu ===
            var matchedSphere = context.Spheres.FirstOrDefault();
            bool isSphereSection = matchedSphere != null && context.Spheres.Count > 0;

            if (isSphereSection && matchedSphere != null)
            {
                var sphereCenter = context.GetPoint(matchedSphere.Center);
                if (sphereCenter == null)
                {
                    Console.WriteLine($"[COMPILER] Không tìm thấy tọa độ tâm mặt cầu: {matchedSphere.Center}");
                    continue;
                }
                double R = matchedSphere.Radius;

                // Khoảng cách từ tâm mặt cầu đến mặt phẳng cắt
                double nLen = Math.Sqrt(plane.A * plane.A + plane.B * plane.B + plane.C * plane.C);
                double d = Math.Abs(plane.A * sphereCenter.X + plane.B * sphereCenter.Y + plane.C * sphereCenter.Z + plane.D) / nLen;

                if (d >= R)
                {
                    Console.WriteLine($"[COMPILER] Mặt phẳng không cắt mặt cầu (d={d:F4} >= R={R:F4})");
                    continue;
                }

                // Bán kính đường tròn thiết diện
                double r = Math.Sqrt(R * R - d * d);

                // Tâm đường tròn thiết diện H = hình chiếu của I lên (P)
                double nx = plane.A / nLen, ny = plane.B / nLen, nz = plane.C / nLen;
                double signedDist = (plane.A * sphereCenter.X + plane.B * sphereCenter.Y + plane.C * sphereCenter.Z + plane.D) / nLen;
                double hx = sphereCenter.X - signedDist * nx;
                double hy = sphereCenter.Y - signedDist * ny;
                double hz = sphereCenter.Z - signedDist * nz;

                Console.WriteLine($"[COMPILER] ✅ Thiết diện TRÒN trên mặt cầu: Tâm H=({hx:F2},{hy:F2},{hz:F2}), r={r:F4}");

                context.Sections.Add(new Application.DTOs.SectionDataDto
                {
                    Id = $"SEC_SPH_{System.Guid.NewGuid().ToString().Substring(0,4)}",
                    TargetSolid = solidStr,
                    CuttingPlane = planeVertices,
                    IsCircle = true,
                    CircleCenter = new Application.DTOs.GeneratedPointDto { X = Math.Round(hx, 6), Y = Math.Round(hy, 6), Z = Math.Round(hz, 6) },
                    CircleRadius = Math.Round(r, 6),
                    Normal = new[] { Math.Round(nx, 6), Math.Round(ny, 6), Math.Round(nz, 6) }
                });
                continue;
            }

            // === GIẢI TÍCH ĐA DIỆN: Dò giao cạnh thẳng (logic cũ) ===
            var solidEdges = GetSolidEdges(solidStr, context);
            if (solidEdges.Count == 0)
            {
                Console.WriteLine($"[COMPILER] Không tìm thấy cạnh nào cho khối {solidStr}");
                continue;
            }

            Console.WriteLine($"[COMPILER] Tìm giao mp({planeStr}) với {solidEdges.Count} cạnh của khối {solidStr}");

            var crossSectionPoints = new List<string>();
            foreach (var (v1, v2) in solidEdges)
            {
                var ep1 = context.GetPoint(v1);
                var ep2 = context.GetPoint(v2);
                if (ep1 == null || ep2 == null) continue;

                double side1 = plane.A * ep1.X + plane.B * ep1.Y + plane.C * ep1.Z + plane.D;
                double side2 = plane.A * ep2.X + plane.B * ep2.Y + plane.C * ep2.Z + plane.D;

                if (side1 * side2 < -1e-9)
                {
                    var line = new Domains.MathCore.Line3D(ep1, ep2);
                    var intersection = plane.IntersectWith(line);
                    if (intersection == null) continue;

                    double segLen = ep1.DistanceToPoint(ep2);
                    double d1 = ep1.DistanceToPoint(intersection);
                    double d2 = ep2.DistanceToPoint(intersection);
                    if (d1 > segLen + 1e-6 || d2 > segLen + 1e-6) continue;

                    string ptName = "";
                    bool merged = false;
                    foreach (var kvp in context.Points)
                    {
                        if (kvp.Value.DistanceToPoint(intersection) < 1e-4)
                        {
                            ptName = kvp.Key;
                            merged = true;
                            break;
                        }
                    }
                    if (!merged)
                    {
                        int csIndex = 1;
                        while (context.Points.ContainsKey($"CS{csIndex}"))
                        {
                            csIndex++;
                        }
                        ptName = $"CS{csIndex}";
                        context.Points[ptName] = intersection;
                    }
                    if (!crossSectionPoints.Contains(ptName)) crossSectionPoints.Add(ptName);

                    Console.WriteLine($"   -> Giao cạnh {v1}{v2}: {ptName} = ({intersection.X:F2}, {intersection.Y:F2}, {intersection.Z:F2})");
                }
                else
                {
                    if (Math.Abs(side1) < 1e-6 && !crossSectionPoints.Contains(v1))
                        crossSectionPoints.Add(v1);
                    if (Math.Abs(side2) < 1e-6 && !crossSectionPoints.Contains(v2))
                        crossSectionPoints.Add(v2);
                }
            }

            if (crossSectionPoints.Count >= 3)
            {
                var orderedPoints = OrderCrossSectionPoints(crossSectionPoints, context, plane);

                for (int i = 0; i < orderedPoints.Count; i++)
                    context.AddGeneratedSegment(orderedPoints[i], orderedPoints[(i + 1) % orderedPoints.Count]);

                context.GeneratedPlanes.Add(new PlaneData
                {
                    Points = orderedPoints.ToArray(),
                    Color = "#ff6b6b",
                    Opacity = 0.25
                });

                context.ClippingPlane = new ClippingPlaneEquation
                {
                    A = plane.A, B = plane.B, C = plane.C, D = plane.D,
                    CrossSectionVertices = orderedPoints.ToArray()
                };
                context.CrossSectionPoints = orderedPoints;

                // Đồng bộ thiết diện với định dạng chuẩn của sections
                context.Sections.Add(new Application.DTOs.SectionDataDto
                {
                    Id = $"SEC_{System.Guid.NewGuid().ToString().Substring(0,4)}",
                    TargetSolid = solidStr,
                    CuttingPlane = planeVertices,
                    Polygon = orderedPoints
                });

                Console.WriteLine($"[COMPILER] ✅ Thiết diện thành công: {string.Join("-", orderedPoints)}");
            }
            else
            {
                Console.WriteLine($"[COMPILER] Chỉ tìm được {crossSectionPoints.Count} giao điểm, không đủ tạo thiết diện.");
            }
        }
    }

    /// <summary>
    /// Lấy tất cả cạnh của khối đa diện.
    /// </summary>
    private List<(string, string)> GetSolidEdges(string solidStr, CompilationContext context)
    {
        var edges = new HashSet<string>();
        var result = new List<(string, string)>();

        if (solidStr.Contains("."))
        {
            var parts = solidStr.Split('.');
            var topVertices = ParseVertices(parts[0]);
            var bottomVertices = ParseVertices(parts[1]);

            if (topVertices.Count == 1 && bottomVertices.Count >= 3)
            {
                string apex = topVertices[0];
                for (int i = 0; i < bottomVertices.Count; i++)
                {
                    AddSolidEdge(edges, result, apex, bottomVertices[i]);
                    AddSolidEdge(edges, result, bottomVertices[i], bottomVertices[(i + 1) % bottomVertices.Count]);
                }
            }
            else if (topVertices.Count >= 3 && bottomVertices.Count >= 3)
            {
                for (int i = 0; i < topVertices.Count; i++)
                {
                    AddSolidEdge(edges, result, topVertices[i], topVertices[(i + 1) % topVertices.Count]);
                    AddSolidEdge(edges, result, bottomVertices[i], bottomVertices[(i + 1) % bottomVertices.Count]);
                    AddSolidEdge(edges, result, topVertices[i], bottomVertices[i]);
                }
            }
        }
        else
        {
            var vertices = ParseVertices(solidStr);
            if (vertices.Count == 4)
            {
                for (int i = 0; i < 4; i++)
                    for (int j = i + 1; j < 4; j++)
                        AddSolidEdge(edges, result, vertices[i], vertices[j]);
            }
        }

        if (result.Count == 0)
        {
            foreach (var seg in context.GeneratedSegments)
            {
                var pts = seg.Split('-');
                if (pts.Length == 2) result.Add((pts[0], pts[1]));
            }
        }

        return result;
    }

    private void AddSolidEdge(HashSet<string> existing, List<(string, string)> list, string a, string b)
    {
        var key = string.Join("-", new[] { a, b }.OrderBy(x => x));
        if (existing.Add(key)) list.Add((a, b));
    }

    /// <summary>
    /// Sắp xếp các điểm thiết diện theo thứ tự vòng quanh trọng tâm.
    /// </summary>
    private List<string> OrderCrossSectionPoints(List<string> pointNames, CompilationContext context, Domains.MathCore.Plane3D plane)
    {
        if (pointNames.Count <= 3) return pointNames;

        var points = pointNames.Select(n => context.Points[n]).ToList();
        var centroid = Domains.MathCore.Point3D.GetCentroid(points.ToArray());

        var normal = plane.Normal;
        double nLen = normal.Magnitude();
        var nNorm = new Domains.MathCore.Vector3D(normal.X / nLen, normal.Y / nLen, normal.Z / nLen);

        Domains.MathCore.Vector3D u;
        if (Math.Abs(nNorm.X) < 0.9)
            u = new Domains.MathCore.Vector3D(1, 0, 0).CrossProduct(nNorm);
        else
            u = new Domains.MathCore.Vector3D(0, 1, 0).CrossProduct(nNorm);

        double uLen = u.Magnitude();
        u = new Domains.MathCore.Vector3D(u.X / uLen, u.Y / uLen, u.Z / uLen);
        var v = nNorm.CrossProduct(u);

        var angles = new List<(string name, double angle)>();
        foreach (var name in pointNames)
        {
            var p = context.Points[name];
            double dx = p.X - centroid.X;
            double dy = p.Y - centroid.Y;
            double dz = p.Z - centroid.Z;
            double projU = dx * u.X + dy * u.Y + dz * u.Z;
            double projV = dx * v.X + dy * v.Y + dz * v.Z;
            angles.Add((name, Math.Atan2(projV, projU)));
        }

        return angles.OrderBy(a => a.angle).Select(a => a.name).ToList();
    }

    /// <summary>
    /// Tính Side (Above/Below/OnPlane) cho mỗi điểm so với mặt phẳng cắt.
    /// Sử dụng phương trình mặt phẳng Ax + By + Cz + D để phân loại.
    /// </summary>
    private void ComputePointSides(CompilationContext context)
    {
        if (context.ClippingPlane == null) return;

        var cp = context.ClippingPlane;
        context.PointSides.Clear();

        foreach (var kvp in context.Points)
        {
            double val = cp.A * kvp.Value.X + cp.B * kvp.Value.Y + cp.C * kvp.Value.Z + cp.D;

            if (Math.Abs(val) < 1e-4)
                context.PointSides[kvp.Key] = PointSide.OnPlane;
            else if (val > 0)
                context.PointSides[kvp.Key] = PointSide.Above;
            else
                context.PointSides[kvp.Key] = PointSide.Below;
        }

        int above = context.PointSides.Values.Count(s => s == PointSide.Above);
        int below = context.PointSides.Values.Count(s => s == PointSide.Below);
        int onPlane = context.PointSides.Values.Count(s => s == PointSide.OnPlane);
        Console.WriteLine($"[COMPILER] Cross-Section Sides: Above={above}, Below={below}, OnPlane={onPlane}");
    }

    private bool IsFaceOfSolid(string planeStr, CompilationContext context)
    {
        var vertices = ParseVertices(planeStr).Select(v => v.ToUpper()).ToList();
        if (vertices.Count < 3) return false;

        foreach (var face in context.GeneratedPlanes)
        {
            var facePoints = face.Points.Select(p => p.ToUpper()).ToList();
            // Nếu tất cả các điểm của mặt phẳng này nằm trong cùng một mặt diện tích đã dựng của khối
            if (vertices.All(v => facePoints.Contains(v)))
            {
                return true;
            }
        }
        return false;
    }

    private List<string> ParseVertices(string input)
    {
        if (string.IsNullOrEmpty(input)) return new List<string>();
        // Bắt chính xác tên đỉnh (A, B, C, A', A1, A'1)
        var matches = System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*");
        return matches.Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
    }
}
