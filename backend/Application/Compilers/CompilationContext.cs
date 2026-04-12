using Domains.MathCore;
using Application.DTOs;
using Application.Compilers.FactValidators;
using System.Linq;

namespace Application.Compilers;

public class CompilationContext
{
    /// <summary>
    /// Cuốn sổ tay lưu trữ Tên ký tự -> Tọa độ 3D.
    /// </summary>
    public Dictionary<string, Point3D> Points { get; set; } = new Dictionary<string, Point3D>();

    /// <summary>
    /// Kết quả kiểm định ngược (Validation Report). Null nếu chưa chạy.
    /// </summary>
    public FullValidationReport? ValidationReport { get; set; }

    /// <summary>
    /// Lưu trữ hằng số 'a' của đề bài (tạm gán a = 5.0 unit trong không gian 3D)
    /// </summary>
    public double UnitLength { get; set; } = 5.0; 

    // Hàm tiện ích: Lấy tọa độ 1 điểm an toàn (không lo bị crash nếu điểm chưa tồn tại)
    public Point3D? GetPoint(string name)
    {
        return Points.TryGetValue(name, out var point) ? point : null;
    }

    // Hàm tiện ích: Lấy danh sách tọa độ từ tên mặt phẳng
    public List<Point3D> GetPointsFromPlane(string planeName)
    {
        var result = new List<Point3D>();
        planeName = planeName.Replace("(", "").Replace(")", "");
        
        var vertices = System.Text.RegularExpressions.Regex.Matches(planeName, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        foreach (string v in vertices)
        {
            if (Points.TryGetValue(v, out var p))
                result.Add(p);
        }
        return result;
    }
 
    // Lấy Line3D từ tên 2 đỉnh (VD: "AB" hoặc "A'B")
    public Line3D? GetLine(string name)
    {
        var vertices = System.Text.RegularExpressions.Regex.Matches(name, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        if (vertices.Count < 2) return null;
 
        var p1 = GetPoint(vertices[0]);
        var p2 = GetPoint(vertices[1]);
 
        if (p1 != null && p2 != null) return new Line3D(p1, p2);
        return null;
    }
 
    // Lấy Plane3D từ tên 3 đỉnh (VD: "ABC" hoặc "(ABCD)")
    public Plane3D? GetPlane(string name)
    {
        var vertices = System.Text.RegularExpressions.Regex.Matches(name, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        if (vertices.Count < 3) return null;
 
        var p1 = GetPoint(vertices[0]);
        var p2 = GetPoint(vertices[1]);
        var p3 = GetPoint(vertices[2]);
 
        if (p1 != null && p2 != null && p3 != null) return new Plane3D(p1, p2, p3);
        return null;
    }

    public List<CircleData> Circles { get; set; } = new();
    public List<SphereData> Spheres { get; set; } = new();

    /// <summary>
    /// Các đoạn thẳng do compiler tự sinh ra (VD: Các cạnh của lăng trụ)
    /// </summary>
    public HashSet<string> GeneratedSegments { get; set; } = new();

    /// <summary>
    /// Các mặt phẳng do compiler tự sinh ra (VD: Mặt đáy, mặt bên lăng trụ)
    /// </summary>
    public List<PlaneData> GeneratedPlanes { get; set; } = new();

    public void AddGeneratedSegment(string p1, string p2)
    {
        // Lưu theo dạng chuẩn để tránh trùng AB và BA
        var s = string.Join("-", new[] { p1, p2 }.OrderBy(c => c));
        GeneratedSegments.Add(s);
    }
}

public class PlaneData
{
    public string[] Points { get; set; } = Array.Empty<string>();
    public string Color { get; set; } = "#6671d1";
    public int Density { get; set; } = 15;
    public double Opacity { get; set; } = 0.2;
}

public class CircleData
{
    public string Center { get; set; } = "";
    public double Radius { get; set; }
    public double[] Normal { get; set; } = { 0, 0, 1 };
    public string Color { get; set; } = "#22B14C";
}

public class SphereData
{
    public string Center { get; set; } = "";
    public double Radius { get; set; }
    public string Color { get; set; } = "#6671d1";
    public double Opacity { get; set; } = 0.1;
}