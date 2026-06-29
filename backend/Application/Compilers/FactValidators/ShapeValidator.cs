using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using System;
using System.Linq;
using System.Collections.Generic;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class ShapeValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Shape;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ShapeData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Target)) 
            return ValidationResult.Skip(fact.Id, fact.Type.ToString(), "Dữ liệu Shape rỗng");

        string target = data.Target.ToUpper();
        var targetVertices = System.Text.RegularExpressions.Regex.Matches(target, @"[A-Z][0-9]*'*(?:\.[A-Z][0-9]*'*)?")
            .Cast<System.Text.RegularExpressions.Match>()
            .Select(m => m.Value)
            .ToList();
        
        // Loại bỏ dấu chấm nếu có trong tên đỉnh (đối với lăng trụ xiên)
        var vertexKeys = targetVertices.SelectMany(v => v.Split('.')).Where(v => !string.IsNullOrEmpty(v)).ToList();

        var points = new List<Domains.MathCore.Point3D>();
        foreach(string v in vertexKeys) {
            var p = context.GetPoint(v);
            if (p != null) points.Add(p);
        }

        if (points.Count < vertexKeys.Count)
            return ValidationResult.Skip(fact.Id, fact.Type.ToString(), $"Chưa dựng đủ đỉnh cho {target}");

        var normalizedShape = NormalizeShape(data.Shape);

        // Kiểm tra Tam giác cân
        if (normalizedShape == ShapeType.Isosceles_triangle && vertexKeys.Count == 3)
        {
            double d1 = points[0].DistanceToPoint(points[1]);
            double d2 = points[1].DistanceToPoint(points[2]);
            double d3 = points[2].DistanceToPoint(points[0]);

            // Tam giác cân chỉ cần 2 cạnh bằng nhau, nên ta tìm độ lệch nhỏ nhất giữa các cặp cạnh
            double minDiff = Math.Min(Math.Min(Math.Abs(d1 - d2), Math.Abs(d2 - d3)), Math.Abs(d3 - d1));
            
            if (minDiff < 1e-3)
                return ValidationResult.Pass(fact.Id, "Shape.Isosceles", 0, minDiff);
            else
                return ValidationResult.Fail(fact.Id, "Shape.Isosceles", 0, minDiff);
        }

        // Kiểm tra Tam giác đều
        if (normalizedShape == ShapeType.Equilateral_triangle && vertexKeys.Count == 3)
        {
            double d1 = points[0].DistanceToPoint(points[1]);
            double d2 = points[1].DistanceToPoint(points[2]);
            double d3 = points[2].DistanceToPoint(points[0]);

            double maxDiff = Math.Max(Math.Max(Math.Abs(d1 - d2), Math.Abs(d2 - d3)), Math.Abs(d3 - d1));
            
            if (maxDiff < 1e-3)
                return ValidationResult.Pass(fact.Id, "Shape.Equilateral", 0, maxDiff);
            else
                return ValidationResult.Fail(fact.Id, "Shape.Equilateral", 0, maxDiff);
        }
        
        // Kiểm tra Tam giác vuông (kiểm tra định lý Pytago hoặc Tích vô hướng)
        if (normalizedShape == ShapeType.Right_triangle && vertexKeys.Count == 3)
        {
            double diff = RightAngleDeviation(points);
            if (diff < 1e-2)
                return ValidationResult.Pass(fact.Id, "Shape.RightTriangle", 0, diff);
            return ValidationResult.Fail(fact.Id, "Shape.RightTriangle", 0, diff);
        }

        if (normalizedShape == ShapeType.Isosceles_right_triangle && vertexKeys.Count == 3)
        {
            double d1 = points[0].DistanceToPoint(points[1]);
            double d2 = points[1].DistanceToPoint(points[2]);
            double d3 = points[2].DistanceToPoint(points[0]);

            double minDiff = Math.Min(Math.Min(Math.Abs(d1 - d2), Math.Abs(d2 - d3)), Math.Abs(d3 - d1));
            double d1Sq = Math.Pow(d1, 2);
            double d2Sq = Math.Pow(d2, 2);
            double d3Sq = Math.Pow(d3, 2);
            var arr = new[] { d1Sq, d2Sq, d3Sq }.OrderBy(x => x).ToArray();
            double rightDiff = Math.Abs(arr[0] + arr[1] - arr[2]);

            if (minDiff < 1e-3 && rightDiff < 1e-2)
                return ValidationResult.Pass(fact.Id, "Shape.IsoscelesRightTriangle", 0, Math.Max(minDiff, rightDiff));

            return ValidationResult.Fail(fact.Id, "Shape.IsoscelesRightTriangle", 0, Math.Max(minDiff, rightDiff));
        }

        if (normalizedShape == ShapeType.Square && vertexKeys.Count == 4)
        {
            return ValidateQuadrilateral(fact, "Shape.Square", points, requireParallelOpposites: true, requireEqualOpposites: true, requireEqualAllSides: true, requireRightAngles: true);
        }

        if (normalizedShape == ShapeType.Rectangle && vertexKeys.Count == 4)
        {
            return ValidateQuadrilateral(fact, "Shape.Rectangle", points, requireParallelOpposites: true, requireEqualOpposites: true, requireEqualAllSides: false, requireRightAngles: true);
        }

        if (normalizedShape == ShapeType.Rhombus && vertexKeys.Count == 4)
        {
            return ValidateQuadrilateral(fact, "Shape.Rhombus", points, requireParallelOpposites: true, requireEqualOpposites: true, requireEqualAllSides: true, requireRightAngles: false);
        }

        if (normalizedShape == ShapeType.Parallelogram && vertexKeys.Count == 4)
        {
            return ValidateQuadrilateral(fact, "Shape.Parallelogram", points, requireParallelOpposites: true, requireEqualOpposites: true, requireEqualAllSides: false, requireRightAngles: false);
        }

        if (normalizedShape == ShapeType.Trapezoid && vertexKeys.Count == 4)
        {
            return ValidateTrapezoid(fact, points);
        }

        if ((normalizedShape == ShapeType.Pentagon && vertexKeys.Count == 5) ||
            (normalizedShape == ShapeType.Hexagon && vertexKeys.Count == 6))
        {
            return ValidateRegularPolygon(fact, $"Shape.{normalizedShape}", points);
        }

        if (normalizedShape == ShapeType.Circle || normalizedShape == ShapeType.Sphere)
        {
            string centerName = string.IsNullOrWhiteSpace(data.Center) ? "O" : data.Center;
            if (context.GetPoint(centerName) != null)
                return ValidationResult.Pass(fact.Id, $"Shape.{normalizedShape}", 0, 0);
        }

        if (IsSupportedSolid(normalizedShape))
        {
            return ValidationResult.Pass(fact.Id, $"Shape.{normalizedShape}", 0, 0);
        }

        // Tạm thời Skip các hình dạng khác chưa định nghĩa logic đo đạc
        return ValidationResult.Skip(fact.Id, fact.Type.ToString(), $"Chưa cài logic chi tiết để check đo đạc cho {data.Shape}");
    }

    private static ShapeType NormalizeShape(ShapeType shape)
    {
        return shape switch
        {
            ShapeType.Regular_cube => ShapeType.Cube,
            ShapeType.Regular_rectangular_cuboid => ShapeType.Rectangular_cuboid,
            ShapeType.Regular_parallelepiped => ShapeType.Parallelepiped,
            ShapeType.Regular_tetrahedron => ShapeType.Tetrahedron,
            ShapeType.Regular_pyramid => ShapeType.Pyramid,
            ShapeType.Regular_prism => ShapeType.Prism,
            ShapeType.Regular_cone => ShapeType.Cone,
            ShapeType.Regular_cylinder => ShapeType.Cylinder,
            ShapeType.Regular_sphere => ShapeType.Sphere,
            _ => shape
        };
    }

    private static bool IsSupportedSolid(ShapeType shape)
    {
        return shape is ShapeType.Tetrahedron or ShapeType.Pyramid or ShapeType.Prism or ShapeType.Cube
            or ShapeType.Rectangular_cuboid or ShapeType.Parallelepiped or ShapeType.Cone or ShapeType.Cylinder
            or ShapeType.Frustum or ShapeType.Pentagonal_pyramid or ShapeType.Hexagonal_pyramid
            or ShapeType.Pentagonal_prism or ShapeType.Hexagonal_prism;
    }

    private static ValidationResult ValidateQuadrilateral(FactDto fact, string label, List<Point3D> points, bool requireParallelOpposites, bool requireEqualOpposites, bool requireEqualAllSides, bool requireRightAngles)
    {
        if (points.Count != 4)
            return ValidationResult.Skip(fact.Id, label, "Thiếu đủ 4 đỉnh");

        double ab = points[0].DistanceToPoint(points[1]);
        double bc = points[1].DistanceToPoint(points[2]);
        double cd = points[2].DistanceToPoint(points[3]);
        double da = points[3].DistanceToPoint(points[0]);

        double diff = 0;
        if (requireEqualAllSides)
        {
            diff = Math.Max(Math.Max(Math.Abs(ab - bc), Math.Abs(bc - cd)), Math.Abs(cd - da));
            if (diff > 1e-3) return ValidationResult.Fail(fact.Id, label, 0, diff);
        }

        if (requireEqualOpposites)
        {
            diff = Math.Max(Math.Abs(ab - cd), Math.Abs(bc - da));
            if (diff > 1e-3) return ValidationResult.Fail(fact.Id, label, 0, diff);
        }

        if (requireParallelOpposites)
        {
            if (!AreParallel(points[0], points[1], points[2], points[3]) || !AreParallel(points[1], points[2], points[3], points[0]))
                return ValidationResult.Fail(fact.Id, label, 0, 1);
        }

        if (requireRightAngles)
        {
            if (!ArePerpendicular(points[0], points[1], points[1], points[2]))
                return ValidationResult.Fail(fact.Id, label, 0, 1);
        }

        return ValidationResult.Pass(fact.Id, label, 0, 0);
    }

    private static ValidationResult ValidateTrapezoid(FactDto fact, List<Point3D> points)
    {
        if (points.Count != 4)
            return ValidationResult.Skip(fact.Id, "Shape.Trapezoid", "Thiếu đủ 4 đỉnh");

        bool abCd = AreParallel(points[0], points[1], points[2], points[3]);
        bool bcDa = AreParallel(points[1], points[2], points[3], points[0]);

        if (abCd || bcDa)
            return ValidationResult.Pass(fact.Id, "Shape.Trapezoid", 0, 0);

        return ValidationResult.Fail(fact.Id, "Shape.Trapezoid", 0, 1);
    }

    private static ValidationResult ValidateRegularPolygon(FactDto fact, string label, List<Point3D> points)
    {
        int n = points.Count;
        if (n < 3)
            return ValidationResult.Skip(fact.Id, label, "Thiếu đủ đỉnh");

        var lengths = new List<double>();
        for (int i = 0; i < n; i++)
            lengths.Add(points[i].DistanceToPoint(points[(i + 1) % n]));

        double maxDiff = lengths.Max(l => Math.Abs(l - lengths[0]));
        if (maxDiff < 1e-3)
            return ValidationResult.Pass(fact.Id, label, 0, maxDiff);

        return ValidationResult.Fail(fact.Id, label, 0, maxDiff);
    }

    private static bool AreParallel(Point3D a1, Point3D a2, Point3D b1, Point3D b2)
    {
        var v1 = new Vector3D(a1, a2);
        var v2 = new Vector3D(b1, b2);
        return v1.CrossProduct(v2).Magnitude() < 1e-4;
    }

    private static bool ArePerpendicular(Point3D a1, Point3D a2, Point3D b1, Point3D b2)
    {
        var v1 = new Vector3D(a1, a2);
        var v2 = new Vector3D(b1, b2);
        return Math.Abs(v1.DotProduct(v2)) < 1e-4;
    }

    private static double RightAngleDeviation(List<Point3D> points)
    {
        double minDot = double.MaxValue;
        for (int i = 0; i < 3; i++)
        {
            var v1 = new Vector3D(points[i], points[(i + 1) % 3]);
            var v2 = new Vector3D(points[i], points[(i + 2) % 3]);
            if (v1.Magnitude() < 1e-6 || v2.Magnitude() < 1e-6) continue;
            minDot = Math.Min(minDot, Math.Abs(v1.DotProduct(v2)));
        }
        return minDot == double.MaxValue ? 1.0 : minDot;
    }
}
