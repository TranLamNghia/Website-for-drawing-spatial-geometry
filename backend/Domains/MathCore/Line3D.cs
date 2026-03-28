using System;

namespace Domains.MathCore;

public class Line3D
{
    public Point3D Point { get; set; }
    public Vector3D Direction { get; set; }

    public Line3D(Point3D point, Vector3D direction)
    {
        if (direction.Magnitude() < 1e-9)
            throw new ArgumentException("Direction vector cannot be 0 (null).");
            
        Point = point;
        Direction = direction;
    }

    public Line3D(Point3D p1, Point3D p2)
    {
        var dir = new Vector3D(p1, p2);
        if (dir.Magnitude() < 1e-9)
            throw new ArgumentException("2 points are the same, cannot create a line.");
            
        Point = p1;
        Direction = dir;
    }

    // Tính khoảng cách từ đường thẳng đến điểm
    public double DistanceToPoint(Point3D point)
    {
        var v = new Vector3D(Point, point);
        var cross = v.CrossProduct(Direction);
        return cross.Magnitude() / Direction.Magnitude();
    }

    // Tính khoảng cách từ đường thẳng đến đường thẳng
    public double DistanceToLine(Line3D other)
    {        
        var cross = Direction.CrossProduct(other.Direction);
        
        // Nếu tích có hướng = 0 => 2 đường thẳng song song (hoặc trùng nhau)
        if (cross.Magnitude() < 1e-9)
        {
            // Trở về bài toán đo khoảng cách từ điểm gốc của đường kia tới đường này
            return DistanceToPoint(other.Point); 
        }
                
        var v = new Vector3D(Point, other.Point);
        return Math.Abs(v.DotProduct(cross)) / cross.Magnitude();
    }

    // Tính giao điểm của đường thẳng và mặt phẳng
    public Point3D? IntersectWith(Line3D other, bool isSegment = false)
    {
        var p1 = this.Point;
        var p2 = other.Point;
        var d1 = this.Direction;
        var d2 = other.Direction;

        // Vector nối 2 điểm gốc
        var w = new Vector3D(p2, p1); 

        // Các hệ số giải hệ phương trình (Tham số t1, t2)
        double a = d1.DotProduct(d1);
        double b = d1.DotProduct(d2);
        double c = d2.DotProduct(d2);
        double d = d1.DotProduct(w);
        double e = d2.DotProduct(w);

        double denominator = a * c - b * b;

        // Nếu mẫu số = 0 => 2 đường thẳng song song
        if (Math.Abs(denominator) < 1e-9)
            return null; 

        double t1 = (b * e - c * d) / denominator;
        double t2 = (a * e - b * d) / denominator;

        // Tính tọa độ rơi trên đường thẳng 1
        var p1_intersect = new Point3D(
            p1.X + d1.X * t1,
            p1.Y + d1.Y * t1,
            p1.Z + d1.Z * t1
        );

        // Tính tọa độ rơi trên đường thẳng 2
        var p2_intersect = new Point3D(
            p2.X + d2.X * t2,
            p2.Y + d2.Y * t2,
            p2.Z + d2.Z * t2
        );

        // Trong 3D, phải check xem 2 điểm có thực sự chạm nhau không (sai số e-6)
        if (p1_intersect.DistanceToPoint(p2_intersect) > 1e-6)
            return null; // Chéo nhau lướt qua chứ không cắt

        // Nếu là đoạn thẳng (Segment), t1 và t2 phải nằm trong [0, 1]
        if (isSegment)
        {
            if (t1 < -1e-6 || t1 > 1 + 1e-6 || t2 < -1e-6 || t2 > 1 + 1e-6)
                return null; // Cắt ở phần kéo dài, không nằm trên đoạn
        }

        return p1_intersect;
    }

    // Góc giữa 2 đường thẳng (Luôn <= 90 độ)
    public double AngleWith(Line3D other)
    {
        double dot = Math.Abs(this.Direction.DotProduct(other.Direction));
        double mags = this.Direction.Magnitude() * other.Direction.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }
}