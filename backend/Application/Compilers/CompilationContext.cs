using Domains.MathCore;
using Application.DTOs;
using System.Linq;

namespace Application.Compilers;

public class CompilationContext
{
    /// <summary>
    /// Cuốn sổ tay lưu trữ Tên ký tự -> Tọa độ 3D.
    /// </summary>
    public Dictionary<string, Point3D> Points { get; set; } = new Dictionary<string, Point3D>();

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
        
        foreach (char c in planeName)
        {
            if (Points.TryGetValue(c.ToString(), out var p))
                result.Add(p);
        }
        return result;
    }
 
    // Lấy Line3D từ tên 2 đỉnh (VD: "AB")
    public Line3D? GetLine(string name)
    {
        name = new string(name.Where(char.IsUpper).ToArray());
        if (name.Length < 2) return null;
 
        var p1 = GetPoint(name[0].ToString());
        var p2 = GetPoint(name[1].ToString());
 
        if (p1 != null && p2 != null) return new Line3D(p1, p2);
        return null;
    }
 
    // Lấy Plane3D từ tên 3 đỉnh (VD: "ABC")
    public Plane3D? GetPlane(string name)
    {
        name = new string(name.Where(char.IsUpper).ToArray());
        if (name.Length < 3) return null;
 
        var p1 = GetPoint(name[0].ToString());
        var p2 = GetPoint(name[1].ToString());
        var p3 = GetPoint(name[2].ToString());
 
        if (p1 != null && p2 != null && p3 != null) return new Plane3D(p1, p2, p3);
        return null;
    }
}