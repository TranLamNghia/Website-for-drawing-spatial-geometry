using System;

namespace Domains.MathCore;

public class Sphere3D
{
    public Point3D Center { get; set; }
    public double Radius { get; set; }

    public Sphere3D(Point3D center, double radius)
    {
        Center = center;
        Radius = radius;
    }

    // Whether the point is inside, on, or outside the sphere
    public bool Contains(Point3D point)
    {
        return Center.DistanceToPoint(point) <= Radius + 1e-9;
    }

    // Sphere volume
    public double GetVolume() => (4.0 / 3.0) * Math.PI * Math.Pow(Radius, 3);
    
    // Sphere surface area
    public double GetSurfaceArea() => 4.0 * Math.PI * Math.Pow(Radius, 2);

    // Circumsphere of a tetrahedron
    public static Sphere3D GetCircumsphere(Point3D p1, Point3D p2, Point3D p3, Point3D p4)
    {
        var center = Point3D.GetCircumcenter(p1, p2, p3, p4);
        if (center == null) center = Point3D.GetCentroid(p1, p2, p3, p4);
        double radius = center.DistanceToPoint(p1);
        return new Sphere3D(center, radius);
    }

    // String representation of the sphere equation
    public override string ToString()
    {
        return $"(x - {Center.X:F2})^2 + (y - {Center.Y:F2})^2 + (z - {Center.Z:F2})^2 = {Radius:F2}^2";
    }
}
