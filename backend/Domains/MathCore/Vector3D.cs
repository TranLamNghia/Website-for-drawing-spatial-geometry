using System;

namespace Domains.MathCore;

public class Vector3D
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Z { get; set; }

    public Vector3D(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }

    public Vector3D(Point3D from, Point3D to)
    {
        X = to.X - from.X;
        Y = to.Y - from.Y;
        Z = to.Z - from.Z;
    }

    // Độ dài của Vector
    public double Magnitude()
    {
        return Math.Sqrt(X * X + Y * Y + Z * Z);
    }

    // Tích vô hướng (Dot Product) - Dùng để tính góc
    public double DotProduct(Vector3D other)
    {
        return (X * other.X) + (Y * other.Y) + (Z * other.Z);
    }

    // Tích có hướng (Cross Product) - Dùng để tìm Vector pháp tuyến vuông góc với 2 Vector
    public Vector3D CrossProduct(Vector3D other)
    {
        return new Vector3D(
            (Y * other.Z) - (Z * other.Y),
            (Z * other.X) - (X * other.Z),
            (X * other.Y) - (Y * other.X)
        );
    }

    // Tính góc giữa 2 Vector (Trả về độ)
    public double AngleWith(Vector3D other)
    {
        double dot = this.DotProduct(other);
        double mags = this.Magnitude() * other.Magnitude();
        if (mags < 1e-9) return 0;
        
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }

    // Nạp chồng toán tử Toán học để code C# nhìn gọn hơn
    public static Vector3D operator +(Vector3D v1, Vector3D v2) => new(v1.X + v2.X, v1.Y + v2.Y, v1.Z + v2.Z);
    public static Vector3D operator -(Vector3D v1, Vector3D v2) => new(v1.X - v2.X, v1.Y - v2.Y, v1.Z - v2.Z);
    public static Vector3D operator *(Vector3D v, double scalar) => new(v.X * scalar, v.Y * scalar, v.Z * scalar);

    // Tích hỗn tạp (Để tính Thể tích tứ diện hoặc kiểm tra Fact: coplanar)
    public double MixedProduct(Vector3D v2, Vector3D v3)
    {
        return this.CrossProduct(v2).DotProduct(v3);
    }

    // Tìm Vector phân giác trong của góc tạo bởi 2 vector (xuất phát từ cùng 1 đỉnh)
    public Vector3D GetBisectorVector(Vector3D other)
    {
        var v1_norm = this.Normalize();
        var v2_norm = other.Normalize();
        // Tổng 2 vector đơn vị sẽ tạo ra đường chéo hình thoi -> chính là phân giác!
        return v1_norm + v2_norm; 
    }

    // Hàm phụ: Chuẩn hóa vector (Trả về vector cùng hướng, độ dài = 1)
    public Vector3D Normalize()
    {
        double mag = Magnitude();
        if (mag < 1e-9) return new Vector3D(0, 0, 0);
        return new Vector3D(X / mag, Y / mag, Z / mag);
    }
}