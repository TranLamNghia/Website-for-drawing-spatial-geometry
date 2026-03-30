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

    // Kiểm tra điểm nằm trong, trên, hay ngoài mặt cầu
    public bool Contains(Point3D point)
    {
        return Center.DistanceToPoint(point) <= Radius + 1e-9;
    }

    // Thể tích mặt cầu
    public double GetVolume() => (4.0 / 3.0) * Math.PI * Math.Pow(Radius, 3);
    
    // Diện tích mặt cầu
    public double GetSurfaceArea() => 4.0 * Math.PI * Math.Pow(Radius, 2);

    // Tìm mặt cầu ngoại tiếp tứ diện
    public static Sphere3D GetCircumsphere(Point3D p1, Point3D p2, Point3D p3, Point3D p4)
    {
        var plane1 = Plane3D.CreatePerpendicularBisector(p1, p2);
        var plane2 = Plane3D.CreatePerpendicularBisector(p1, p3);
        var plane3 = Plane3D.CreatePerpendicularBisector(p1, p4);
        var intersectionLine = plane1.IntersectWith(plane2);
        if (intersectionLine == null) throw new Exception("4 điểm này đồng phẳng, không tạo được mặt cầu!");

        var center = plane3.IntersectWith(intersectionLine);
        if (center == null) throw new Exception("Không thể tìm được tâm mặt cầu.");

        double radius = center.DistanceToPoint(p1);

        return new Sphere3D(center, radius);
    }

    // Hiện phương trình mặt cầu
    public override string ToString()
    {
        return $"(x - {Center.X:F2})^2 + (y - {Center.Y:F2})^2 + (z - {Center.Z:F2})^2 = {Radius:F2}^2";
    }
}