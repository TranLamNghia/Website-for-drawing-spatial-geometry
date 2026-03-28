using System;

namespace Domains.MathCore;

public class Point3D
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Z { get; set; }

    public Point3D(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }

    // Tính khoảng cách tới một điểm khác
    public double DistanceToPoint(Point3D other)
    {
        return Math.Sqrt(Math.Pow(X - other.X, 2) + Math.Pow(Y - other.Y, 2) + Math.Pow(Z - other.Z, 2));
    }

    // Tìm trung điểm của đoạn thẳng tạo bởi 2 điểm
    public Point3D GetMidpoint(Point3D other)
    {
        return new Point3D((X + other.X) / 2, (Y + other.Y) / 2, (Z + other.Z) / 2);
    }

    /// Tìm điểm chia đoạn thẳng theo tỉ lệ (Fact: ratio)
    public Point3D GetPointAtRatio(Point3D other, double ratio)
    {
        return new Point3D(
            this.X + (other.X - this.X) * ratio,
            this.Y + (other.Y - this.Y) * ratio,
            this.Z + (other.Z - this.Z) * ratio
        );
    }

    // Tìm trọng tâm (Fact: centroid) - NÊN CHUYỂN TỪ PLANE3D VỀ ĐÂY
    public static Point3D GetCentroid(params Point3D[] points)
    {
        if (points == null || points.Length == 0)
            throw new ArgumentException("Need at least one point.");

        double sumX = 0, sumY = 0, sumZ = 0;
        foreach (var p in points) { sumX += p.X; sumY += p.Y; sumZ += p.Z; }
        return new Point3D(sumX / points.Length, sumY / points.Length, sumZ / points.Length);
    }

    // Thêm vào cuối class Point3D
    public override string ToString()
    {
        return $"({X:F2}, {Y:F2}, {Z:F2})"; // In ra format (0.00, 0.00, 0.00)
    }
}