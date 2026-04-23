using System;
using System.Linq;
using System.Collections.Generic;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class IntersectionHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Intersection;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<IntersectionData>();
        if (data == null || data.Objects == null || data.Objects.Count < 2) return;

        string target = data.Result?.Value ?? "";
        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        // Phân loại đối tượng dựa trên số ký tự đỉnh
        var obj1Vertices = ParseVertices(obj1);
        var obj2Vertices = ParseVertices(obj2);

        // ===== CASE: Plane - Solid (Lát cắt) =====
        // Nếu một trong hai đối tượng là mặt phẳng (>=3 đỉnh) và đối tượng kia là khối đặc (chứa '.' hoặc >= 4 đỉnh)
        bool obj1IsPlane = obj1Vertices.Count >= 3 && !obj1.Contains(".");
        bool obj2IsPlane = obj2Vertices.Count >= 3 && !obj2.Contains(".");
        bool obj1IsSolid = obj1.Contains(".") || obj1Vertices.Count >= 4;
        bool obj2IsSolid = obj2.Contains(".") || obj2Vertices.Count >= 4;

        if ((obj1IsPlane && obj2IsSolid) || (obj2IsPlane && obj1IsSolid))
        {
            string planeStr = obj1IsPlane ? obj1 : obj2;
            string solidStr = obj1IsSolid ? obj1 : obj2;
            HandlePlaneSolidIntersection(planeStr, solidStr, target, context);
            return;
        }

        // ===== Các case thông thường (Line-Line, Line-Plane) =====
        if (string.IsNullOrEmpty(target)) return;
        if (context.Points.ContainsKey(target)) return;

        Point3D? intersectPoint = null;

        // Case A: Line - Line
        if (obj1Vertices.Count == 2 && obj2Vertices.Count == 2)
        {
            var l1 = context.GetLine(obj1);
            var l2 = context.GetLine(obj2);
            if (l1 != null && l2 != null) intersectPoint = l1.IntersectWith(l2);
        }
        // Case B: Line - Plane
        else if (obj1Vertices.Count == 2 && obj2Vertices.Count >= 3)
        {
            var line = context.GetLine(obj1);
            var plane = context.GetPlane(obj2);
            if (line != null && plane != null) intersectPoint = plane.IntersectWith(line);
        }
        // Case C: Plane - Line
        else if (obj1Vertices.Count >= 3 && obj2Vertices.Count == 2)
        {
            var plane = context.GetPlane(obj1);
            var line = context.GetLine(obj2);
            if (plane != null && line != null) intersectPoint = plane.IntersectWith(line);
        }

        if (intersectPoint != null)
        {
            context.Points[target] = intersectPoint;
            Console.WriteLine($"[HANDLER] Đã dựng giao điểm {target} giữa {obj1} và {obj2}");
        }
    }

    /// <summary>
    /// Xử lý giao giữa một mặt phẳng cắt và một khối đa diện.
    /// Tìm giao điểm của mặt phẳng với TẤT CẢ các cạnh của khối.
    /// </summary>
    private void HandlePlaneSolidIntersection(string planeStr, string solidStr, string resultTarget, CompilationContext context)
    {
        var plane = context.GetPlane(planeStr);
        if (plane == null) return;

        // Lấy tất cả cạnh của khối đa diện
        List<(string, string)> solidEdges = GetSolidEdges(solidStr, context);
        if (solidEdges.Count == 0) return;

        Console.WriteLine($"[HANDLER] Cross-Section: Cắt mp({planeStr}) với khối {solidStr}. Tìm thấy {solidEdges.Count} cạnh.");

        var crossSectionPoints = new List<string>();
        int autoIndex = 1;

        foreach (var (v1, v2) in solidEdges)
        {
            var p1 = context.GetPoint(v1);
            var p2 = context.GetPoint(v2);
            if (p1 == null || p2 == null) continue;

            // Kiểm tra xem cạnh có cắt mặt phẳng không
            double side1 = plane.A * p1.X + plane.B * p1.Y + plane.C * p1.Z + plane.D;
            double side2 = plane.A * p2.X + plane.B * p2.Y + plane.C * p2.Z + plane.D;

            // Nếu 2 điểm nằm khác phía (side1 * side2 < 0), cạnh cắt mặt phẳng
            if (side1 * side2 < -1e-9)
            {
                var line = new Line3D(p1, p2);
                var intersection = plane.IntersectWith(line);
                if (intersection != null)
                {
                    // Kiểm tra giao điểm có nằm trong đoạn thẳng không (0 <= t <= 1)
                    double segLen = p1.DistanceToPoint(p2);
                    double d1 = p1.DistanceToPoint(intersection);
                    double d2 = p2.DistanceToPoint(intersection);

                    if (d1 <= segLen + 1e-6 && d2 <= segLen + 1e-6)
                    {
                        // Tìm tên điểm giao: Dùng tên mặc định hoặc auto-generate
                        string ptName = $"X{autoIndex++}";
                        
                        // Nếu giao điểm trùng với đỉnh đã có
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
                            context.Points[ptName] = intersection;
                        }
                        crossSectionPoints.Add(ptName);
                        Console.WriteLine($"   -> Giao với cạnh {v1}{v2}: Điểm {ptName} = {intersection}");
                    }
                }
            }
            // Nếu đỉnh nằm trên mặt phẳng (side ≈ 0)
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
            // Sắp xếp các điểm thiết diện theo thứ tự vòng (convex hull trên mặt phẳng)
            var orderedPoints = OrderCrossSectionPoints(crossSectionPoints, context, plane);

            // Đăng ký cạnh thiết diện
            for (int i = 0; i < orderedPoints.Count; i++)
            {
                context.AddGeneratedSegment(orderedPoints[i], orderedPoints[(i + 1) % orderedPoints.Count]);
            }

            // Đăng ký mặt phẳng thiết diện (để vẽ tô màu)
            context.GeneratedPlanes.Add(new PlaneData
            {
                Points = orderedPoints.ToArray(),
                Color = "#ff6b6b",
                Opacity = 0.25
            });

            // Lưu ClippingPlane vào context
            context.ClippingPlane = new ClippingPlaneEquation
            {
                A = plane.A,
                B = plane.B,
                C = plane.C,
                D = plane.D,
                CrossSectionVertices = orderedPoints.ToArray()
            };
            context.CrossSectionPoints = orderedPoints;

            Console.WriteLine($"[HANDLER] Cross-Section thành công! Thiết diện: {string.Join("-", orderedPoints)}");
        }
        else if (crossSectionPoints.Count > 0)
        {
            Console.WriteLine($"[HANDLER] Cross-Section: Chỉ tìm thấy {crossSectionPoints.Count} giao điểm, không đủ tạo thiết diện.");
        }
    }

    /// <summary>
    /// Lấy tất cả cạnh của khối đa diện từ chuỗi target (VD: "S.ABCD", "ABCD", "ABC.A'B'C'")
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
                // Pyramid: S.ABC...
                string apex = topVertices[0];
                for (int i = 0; i < bottomVertices.Count; i++)
                {
                    AddEdge(edges, result, apex, bottomVertices[i]);
                    AddEdge(edges, result, bottomVertices[i], bottomVertices[(i + 1) % bottomVertices.Count]);
                }
            }
            else if (topVertices.Count >= 3 && bottomVertices.Count >= 3)
            {
                // Prism: ABC.A'B'C'
                for (int i = 0; i < topVertices.Count; i++)
                {
                    // Cạnh đáy dưới
                    AddEdge(edges, result, topVertices[i], topVertices[(i + 1) % topVertices.Count]);
                    // Cạnh đáy trên
                    AddEdge(edges, result, bottomVertices[i], bottomVertices[(i + 1) % bottomVertices.Count]);
                    // Cạnh bên
                    AddEdge(edges, result, topVertices[i], bottomVertices[i]);
                }
            }
        }
        else
        {
            var vertices = ParseVertices(solidStr);
            if (vertices.Count == 4)
            {
                // Tetrahedron ABCD: 6 cạnh
                for (int i = 0; i < 4; i++)
                    for (int j = i + 1; j < 4; j++)
                        AddEdge(edges, result, vertices[i], vertices[j]);
            }
        }

        // Fallback: Dùng segments đã sinh trong context
        if (result.Count == 0)
        {
            foreach (var seg in context.GeneratedSegments)
            {
                var pts = seg.Split('-');
                if (pts.Length == 2)
                    result.Add((pts[0], pts[1]));
            }
        }

        return result;
    }

    private void AddEdge(HashSet<string> existing, List<(string, string)> list, string a, string b)
    {
        var key = string.Join("-", new[] { a, b }.OrderBy(x => x));
        if (existing.Add(key))
            list.Add((a, b));
    }

    /// <summary>
    /// Sắp xếp các điểm thiết diện theo thứ tự vòng quanh trọng tâm trên mặt phẳng cắt.
    /// </summary>
    private List<string> OrderCrossSectionPoints(List<string> pointNames, CompilationContext context, Plane3D plane)
    {
        if (pointNames.Count <= 3) return pointNames;

        // Tính trọng tâm
        var points = pointNames.Select(n => context.Points[n]).ToList();
        var centroid = Point3D.GetCentroid(points.ToArray());

        // Tạo hệ trục cục bộ trên mặt phẳng
        var normal = plane.Normal;
        double nLen = normal.Magnitude();
        var nNorm = new Vector3D(normal.X / nLen, normal.Y / nLen, normal.Z / nLen);

        // Tìm vector u vuông góc với normal
        Vector3D u;
        if (Math.Abs(nNorm.X) < 0.9)
            u = new Vector3D(1, 0, 0).CrossProduct(nNorm);
        else
            u = new Vector3D(0, 1, 0).CrossProduct(nNorm);

        double uLen = u.Magnitude();
        u = new Vector3D(u.X / uLen, u.Y / uLen, u.Z / uLen);
        var v = nNorm.CrossProduct(u);

        // Tính góc của mỗi điểm so với trọng tâm
        var angles = new List<(string name, double angle)>();
        foreach (var name in pointNames)
        {
            var p = context.Points[name];
            double dx = p.X - centroid.X;
            double dy = p.Y - centroid.Y;
            double dz = p.Z - centroid.Z;

            double projU = dx * u.X + dy * u.Y + dz * u.Z;
            double projV = dx * v.X + dy * v.Y + dz * v.Z;
            double angle = Math.Atan2(projV, projU);
            angles.Add((name, angle));
        }

        return angles.OrderBy(a => a.angle).Select(a => a.name).ToList();
    }

    private List<string> ParseVertices(string input)
    {
        if (string.IsNullOrEmpty(input)) return new List<string>();
        var matches = System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*");
        return matches.Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
    }
}
