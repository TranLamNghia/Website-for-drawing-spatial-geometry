using System;

namespace GeometryVisualizer.Domain.MathCore;

public class Sphere3D
{
    public Point3D Center { get; set; }
    public double Radius { get; set; }

    public Sphere3D(Point3D center, double radius)
    {
        Center = center;
        Radius = radius;
    }

    // Kiểm tra điểm nằm trong, trên, hay ngoài mặt cầu
    public bool Contains(Point3D point)
    {
        return Center.DistanceToPoint(point) <= Radius + 1e-9;
    }

    // Thể tích mặt cầu
    public double GetVolume() => (4.0 / 3.0) * Math.PI * Math.Pow(Radius, 3);
    
    // Diện tích mặt cầu
    public double GetSurfaceArea() => 4.0 * Math.PI * Math.Pow(Radius, 2);
}