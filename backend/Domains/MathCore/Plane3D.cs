using System;

namespace Domains.MathCore;

public class Plane3D
{
    public double A { get; set; }
    public double B { get; set; }
    public double C { get; set; }
    public double D { get; set; }

    public Vector3D Normal => new Vector3D(A, B, C);

    public Plane3D(Point3D point, Vector3D normal)
    {
        A = normal.X;
        B = normal.Y;
        C = normal.Z;
        D = -(A * point.X + B * point.Y + C * point.Z);
    }

    public Plane3D(Point3D p1, Point3D p2, Point3D p3)
    {
        var v1 = new Vector3D(p1, p2);
        var v2 = new Vector3D(p1, p3);
        
        var normal = v1.CrossProduct(v2);

        if (normal.Magnitude() < 1e-9)
            throw new ArgumentException("3 point are collinear, cannot create a plane");

        A = normal.X;
        B = normal.Y;
        C = normal.Z;
        D = -(A * p1.X + B * p1.Y + C * p1.Z);
    }

    // Tính khoảng cách từ mặt phẳng đến điểm
    public double DistanceToPoint(Point3D point)
    {
        return Math.Abs(A * point.X + B * point.Y + C * point.Z + D) / Normal.Magnitude();
    }

    // Tính khoảng cách từ mặt phẳng đến đường thẳng
    public double DistanceToLine(Line3D line)
    {
        // 1. Kiểm tra góc giữa chỉ phương đường thẳng và pháp tuyến mặt phẳng
        // Nếu tích vô hướng == 0 => Đường thẳng song song hoặc nằm trong mặt phẳng
        double dot = Normal.DotProduct(line.Direction);
        
        if (Math.Abs(dot) < 1e-9) 
        {
            return DistanceToPoint(line.Point);
        }
        
        return 0; // Đường thẳng cắt mặt phẳng (khoảng cách = 0)
    }

    // Tính khoảng cách từ mặt phẳng đến mặt phẳng khác
    public double DistanceToPlane(Plane3D other)
    {
        // 1. Kiểm tra 2 pháp tuyến có cùng phương (song song) không
        var cross = this.Normal.CrossProduct(other.Normal);
        
        if (cross.Magnitude() < 1e-9)
        {
            // Tìm 1 điểm P bất kỳ nằm trên mặt phẳng 'other'
            Point3D p;
            if (Math.Abs(other.A) > 1e-9) p = new Point3D(-other.D / other.A, 0, 0);
            else if (Math.Abs(other.B) > 1e-9) p = new Point3D(0, -other.D / other.B, 0);
            else p = new Point3D(0, 0, -other.D / other.C);

            return this.DistanceToPoint(p);
        }

        return 0; // Hai mặt phẳng cắt nhau (khoảng cách = 0)
    }

    // Tìm giao tuyến của 2 mặt phẳng (Trả về 1 đường thẳng Line3D)
    public Line3D? IntersectWith(Plane3D other)
    {
        // 1. Vectơ chỉ phương của giao tuyến là tích có hướng của 2 pháp tuyến
        var direction = this.Normal.CrossProduct(other.Normal);

        // Nếu tích có hướng ≈ 0 => 2 mặt phẳng song song hoặc trùng nhau
        if (direction.Magnitude() < 1e-9)
            return null;

        // 2. Tìm một điểm chung P(x, y, z) bằng cách giải hệ phương trình
        // Ta sẽ thử lần lượt đặt 1 trong 3 biến x, y, z bằng 0
        double x = 0, y = 0, z = 0;
        double detXY = this.A * other.B - this.B * other.A;
        double detYZ = this.B * other.C - this.C * other.B;
        double detZX = this.C * other.A - this.A * other.C;

        if (Math.Abs(detXY) > 1e-9)
        {
            x = (this.B * other.D - other.B * this.D) / detXY;
            y = (other.A * this.D - this.A * other.D) / detXY;
            z = 0;
        }
        else if (Math.Abs(detYZ) > 1e-9)
        {
            x = 0;
            y = (this.C * other.D - other.C * this.D) / detYZ;
            z = (other.B * this.D - this.B * other.D) / detYZ;
        }
        else
        {
            x = (other.C * this.D - this.C * other.D) / detZX;
            y = 0;
            z = (this.A * other.D - other.A * this.D) / detZX;
        }

        return new Line3D(new Point3D(x, y, z), direction);
    }

    // Tìm giao điểm của mặt phẳng và đường thẳng
    public Point3D? IntersectWith(Line3D line)
    {
        double denominator = A * line.Direction.X + B * line.Direction.Y + C * line.Direction.Z;
        
        if (Math.Abs(denominator) < 1e-9) 
            return null;

        double numerator = -(A * line.Point.X + B * line.Point.Y + C * line.Point.Z + D);
        double t = numerator / denominator;

        return new Point3D(
            line.Point.X + line.Direction.X * t,
            line.Point.Y + line.Direction.Y * t,
            line.Point.Z + line.Direction.Z * t
        );
    }
    
    // Tìm hình chiếu của một điểm lên mặt phẳng (Fact: projection)
    public Point3D GetProjection(Point3D point)
    {
        double t = -(A * point.X + B * point.Y + C * point.Z + D) / (A * A + B * B + C * C);
        return new Point3D(point.X + A * t, point.Y + B * t, point.Z + C * t);
    }

    // Góc giữa 2 Mặt phẳng (AngleType: plane_plane)
    public double AngleWithPlane(Plane3D other)
    {
        double dot = Math.Abs(this.Normal.DotProduct(other.Normal));
        double mags = this.Normal.Magnitude() * other.Normal.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }

    // Góc giữa Mặt phẳng và Đường thẳng (AngleType: line_plane)
    public double AngleWithLine(Line3D line)
    {
        double dot = Math.Abs(this.Normal.DotProduct(line.Direction));
        double mags = this.Normal.Magnitude() * line.Direction.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Asin(dot / mags) * (180.0 / Math.PI); // Dùng Asin thay vì Acos
    }
}