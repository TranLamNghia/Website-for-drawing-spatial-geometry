using System;
using System.Collections.Generic;
using Application.DTOs.Enums;
using Domains.MathCore;

namespace Application.Compilers;

public static class ShapeBuildHelper
{
    public static ShapeType ResolveSolidBaseShape(ShapeType shape) => shape switch
    {
        ShapeType.Regular_tetrahedron => ShapeType.Equilateral_triangle,
        ShapeType.Cube or ShapeType.Regular_cube => ShapeType.Square,
        ShapeType.Rectangular_cuboid or ShapeType.Regular_rectangular_cuboid => ShapeType.Rectangle,
        ShapeType.Parallelepiped or ShapeType.Regular_parallelepiped => ShapeType.Parallelogram,
        ShapeType.Pentagonal_pyramid => ShapeType.Pentagon,
        ShapeType.Hexagonal_pyramid => ShapeType.Hexagon,
        ShapeType.Pentagonal_prism => ShapeType.Pentagon,
        ShapeType.Hexagonal_prism => ShapeType.Hexagon,
        ShapeType.Pyramid => ShapeType.Square,
        ShapeType.Regular_pyramid => ShapeType.Square,
        _ => shape
    };

    public static void PlaceRegularPolygon(
        Dictionary<string, Point3D> points,
        IReadOnlyList<string> vertices,
        double edgeLength)
    {
        int n = vertices.Count;
        if (n < 3) return;

        double circumRadius = edgeLength / (2.0 * Math.Sin(Math.PI / n));
        for (int i = 0; i < n; i++)
        {
            double angle = 2.0 * Math.PI * i / n - Math.PI / 2.0;
            points[vertices[i]] = new Point3D(
                circumRadius * Math.Cos(angle),
                circumRadius * Math.Sin(angle),
                0);
        }
    }

    /// <summary>
    /// Dịch chân đường cao (hình chiếu đỉnh) lệch khỏi trọng tâm đáy theo tỉ lệ offsetRatio (mặc định 30%).
    /// </summary>
    public static Point3D OffsetProjectionFoot(Point3D centroid, IReadOnlyList<Point3D> basePts, double offsetRatio = 0.3)
    {
        if (basePts.Count < 2) return centroid;

        double dx = basePts[1].X - centroid.X;
        double dy = basePts[1].Y - centroid.Y;
        double dz = basePts[1].Z - centroid.Z;

        return new Point3D(
            centroid.X + dx * offsetRatio,
            centroid.Y + dy * offsetRatio,
            centroid.Z + dz * offsetRatio);
    }
}
