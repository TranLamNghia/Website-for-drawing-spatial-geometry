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

    // Tìm điểm chia đoạn thẳng theo tỉ lệ
    public Point3D GetPointAtRatio(Point3D other, double ratio)
    {
        return new Point3D(
            this.X + (other.X - this.X) * ratio,
            this.Y + (other.Y - this.Y) * ratio,
            this.Z + (other.Z - this.Z) * ratio
        );
    }

    // Tìm trọng tâm
    public static Point3D GetCentroid(params Point3D[] points)
    {
        if (points == null || points.Length == 0)
            throw new ArgumentException("Need at least one point.");

        double sumX = 0, sumY = 0, sumZ = 0;
        foreach (var p in points) { sumX += p.X; sumY += p.Y; sumZ += p.Z; }
        return new Point3D(sumX / points.Length, sumY / points.Length, sumZ / points.Length);
    }
 
    // Tìm tâm đường tròn nội tiếp
    public static Point3D GetIncenter(Point3D p1, Point3D p2, Point3D p3)
    {
        double a = p2.DistanceToPoint(p3);
        double b = p1.DistanceToPoint(p3);
        double c = p1.DistanceToPoint(p2);
 
        double sum = a + b + c;
        return new Point3D(
            (a * p1.X + b * p2.X + c * p3.X) / sum,
            (a * p1.Y + b * p2.Y + c * p3.Y) / sum,
            (a * p1.Z + b * p2.Z + c * p3.Z) / sum
        );
    }
 
    // Tìm tâm đường tròn ngoại tiếp
    public static Point3D GetCircumcenter(Point3D p1, Point3D p2, Point3D p3)
    {
        // Sử dụng giao điểm của 2 mặt trung trực và mặt phẳng chứa tam giác
        var plane = new Plane3D(p1, p2, p3);
        var bisector12 = Plane3D.CreatePerpendicularBisector(p1, p2);
        var bisector23 = Plane3D.CreatePerpendicularBisector(p2, p3);
 
        var lineIntersect = bisector12.IntersectWith(bisector23);
        if (lineIntersect == null) return p1; // Lỗi hiếm gặp
 
        return plane.IntersectWith(lineIntersect) ?? p1;
    }
 
    // Tìm trực tâm
    public static Point3D GetOrthocenter(Point3D p1, Point3D p2, Point3D p3)
    {
        // H = 3G - 2O (H: Trực tâm, G: Trọng tâm, O: Tâm ngoại tiếp)
        var g = GetCentroid(p1, p2, p3);
        var o = GetCircumcenter(p1, p2, p3);
 
        return new Point3D(
            3 * g.X - 2 * o.X,
            3 * g.Y - 2 * o.Y,
            3 * g.Z - 2 * o.Z
        );
    }

    // Hàm phụ trợ: Tính diện tích tam giác trong không gian 3D bằng Tích có hướng
    public static double GetTriangleArea(Point3D p1, Point3D p2, Point3D p3)
    {
        var v1 = new Vector3D(p1, p2);
        var v2 = new Vector3D(p1, p3);
        // Diện tích = 1/2 độ dài của Vector tích có hướng
        return v1.CrossProduct(v2).Magnitude() / 2.0;
    }

    // Tìm tâm mặt cầu nội tiếp tứ diện
    public static Point3D GetTetrahedronIncenter(Point3D a, Point3D b, Point3D c, Point3D d)
    {
        // Tính diện tích 4 mặt đối diện
        double sA = GetTriangleArea(b, c, d); // Mặt đối diện đỉnh A
        double sB = GetTriangleArea(a, c, d); // Mặt đối diện đỉnh B
        double sC = GetTriangleArea(a, b, d); // Mặt đối diện đỉnh C
        double sD = GetTriangleArea(a, b, c); // Mặt đối diện đỉnh D

        double sumArea = sA + sB + sC + sD;
        if (sumArea < 1e-9) return a; // Tránh lỗi chia cho 0 nếu bị suy biến

        return new Point3D(
            (sA * a.X + sB * b.X + sC * c.X + sD * d.X) / sumArea,
            (sA * a.Y + sB * b.Y + sC * c.Y + sD * d.Y) / sumArea,
            (sA * a.Z + sB * b.Z + sC * c.Z + sD * d.Z) / sumArea
        );
    }

    // SIÊU HÀM: Tìm tâm mặt cầu nội tiếp của khối chóp đều (VD: S.ABCD)
    public static Point3D GetRegularPyramidIncenter(Point3D apex, params Point3D[] basePoints)
    {
        if (basePoints.Length < 3)
            throw new ArgumentException("Đáy của hình chóp phải có ít nhất 3 đỉnh.");

        // 1. Tìm tâm đáy H (Vì là chóp đều, hình chiếu của đỉnh trùng với trọng tâm đáy)
        var h = GetCentroid(basePoints);

        // 2. Tính chiều cao h (Khoảng cách từ S đến H)
        double height = apex.DistanceToPoint(h);
        if (height < 1e-9) return h; // Tránh lỗi chia cho 0 nếu chóp bị bẹp (chiều cao = 0)

        // 3. Tính Diện tích đáy và Diện tích xung quanh
        double baseArea = 0;
        double lateralArea = 0;
        int n = basePoints.Length;

        for (int i = 0; i < n; i++)
        {
            var p1 = basePoints[i];
            var p2 = basePoints[(i + 1) % n]; // Đỉnh tiếp theo (nối vòng tròn)

            // Cắt đáy thành các tam giác nhỏ nối từ tâm H: Diện tích tam giác (H, p1, p2)
            baseArea += GetTriangleArea(h, p1, p2);

            // Diện tích mặt bên: Diện tích tam giác (S, p1, p2)
            lateralArea += GetTriangleArea(apex, p1, p2);
        }

        // 4. Tính bán kính nội tiếp r
        double r = (baseArea * height) / (baseArea + lateralArea);

        // 5. Tìm tọa độ điểm I nằm trên đoạn thẳng H -> S
        // Tỉ lệ khoảng cách từ H đến I so với cả đoạn HS chính là (r / height)
        return h.GetPointAtRatio(apex, r / height);
    }

    // Hiện tọa độ điểm
    public override string ToString()
    {
        return $"({X:F2}, {Y:F2}, {Z:F2})"; // In ra format (0.00, 0.00, 0.00)
    }
}