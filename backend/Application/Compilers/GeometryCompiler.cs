using System;
using System.Linq;
using System.Data;
using System.Collections.Generic;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers;

public class GeometryCompiler : IGeometryCompiler
{
    public CompilationContext Compile(GeometryProblemDto problem)
    {
        // Khởi tạo cuốn sổ tay trắng
        var context = new CompilationContext();

        // Pipeline Giai đoạn 1: Dựng móng nhà (Mặt đáy nằm trên mp z = 0)
        BuildBase(problem, context);

        // Pipeline Giai đoạn 2: Tìm hình chiếu và dựng chiều cao Z cho đỉnh chóp
        // BuildApex(problem, context); // Sẽ mở khóa ở bước sau

        // Pipeline Giai đoạn 3: Tính toán trung điểm, trọng tâm, giao điểm...
        // BuildDependentEntities(problem, context); // Sẽ mở khóa ở bước sau

        return context;
    }

    /// <summary>
    /// Giai đoạn 1: Đọc Fact "shape" và dựng tọa độ mặt đáy (z = 0)
    /// </summary>
    private void BuildBase(GeometryProblemDto problem, CompilationContext context)
    {
        var validBaseShapes = new[] 
        { 
            ShapeType.Square, ShapeType.Rectangle, ShapeType.Rhombus, ShapeType.Parallelogram, 
            ShapeType.Trapezoid, ShapeType.Triangle, ShapeType.Equilateral_triangle, 
            ShapeType.Right_triangle, ShapeType.Isosceles_triangle, ShapeType.Isosceles_right_triangle 
        };

        var shapeData = problem.Facts
            .Where(f => f.Type == FactType.Shape)
            .Select(f => f.GetDataAs<ShapeData>())
            .FirstOrDefault(d => d != null && validBaseShapes.Contains(d.Shape));

        if (shapeData == null) return;

        string rawTarget = shapeData.Target ?? "";
        string target = new string(rawTarget.Where(char.IsUpper).ToArray());
        
        if (target.Length > 3 && target.StartsWith("S")) target = target.Substring(1);

        double aValue = context.UnitLength;

        // 1. QUÉT TÌM CHIỀU DÀI CÁC CẠNH (TỰ ĐỘNG THÍCH ỨNG VỚI MỌI TÊN ĐỈNH)
        
        // Tìm Width (Cạnh ngang - VD: AB hoặc CD)
        double width = GetDynamicEdgeLength(problem, target, 0, 1, -1, aValue);
        if (width == -1 && target.Length >= 4) width = GetDynamicEdgeLength(problem, target, 2, 3, -1, aValue); // Tìm cạnh đối diện
        if (width == -1) width = aValue; // Mặc định

        // Tìm Height (Cạnh dọc - VD: BC hoặc AD)
        double height = GetDynamicEdgeLength(problem, target, 1, 2, -1, aValue);
        if (height == -1 && target.Length >= 4) height = GetDynamicEdgeLength(problem, target, 0, 3, -1, aValue); // Tìm cạnh đối diện
        
        // Nếu không có Fact nào nói về Height, ta gán mặc định tùy theo loại hình
        if (height == -1) 
        {
            if (shapeData.Shape == ShapeType.Rectangle || shapeData.Shape == ShapeType.Parallelogram) height = width * 2; // HCN mặc định dài gấp đôi rộng
            else height = width; // Hình vuông, thoi...
        }

        // 2. DỰNG HÌNH THEO KHUÔN MẪU TƯƠNG ĐỐI (DÙNG WIDTH VÀ HEIGHT ĐỘNG)
        switch (shapeData.Shape)
        {
            // ================= NHÓM TỨ GIÁC =================
            case ShapeType.Square:
            case ShapeType.Rectangle: 
                if (target.Length >= 4) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0);      
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0);      
                    context.Points[target[2].ToString()] = new Point3D(width, height, 0);  
                    context.Points[target[3].ToString()] = new Point3D(0, height, 0);  
                }
                break;

            case ShapeType.Rhombus: // Hình thoi (4 cạnh = width, góc 60 độ)
                if (target.Length >= 4) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0);      
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0);      
                    context.Points[target[2].ToString()] = new Point3D(width * 1.5, width * Math.Sqrt(3) / 2, 0); 
                    context.Points[target[3].ToString()] = new Point3D(width * 0.5, width * Math.Sqrt(3) / 2, 0); 
                }
                break;

            case ShapeType.Parallelogram: // Hình bình hành (Đáy width, cạnh bên height, góc 60 độ)
                if (target.Length >= 4) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0);       
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0);       
                    context.Points[target[2].ToString()] = new Point3D(width + height * 0.5, height * Math.Sqrt(3) / 2, 0); 
                    context.Points[target[3].ToString()] = new Point3D(height * 0.5, height * Math.Sqrt(3) / 2, 0); 
                }
                break;

            case ShapeType.Trapezoid: // Hình thang (Mặc định thang vuông tại góc 0 và 3, đáy nhỏ = 1/2 đáy lớn)
                if (target.Length >= 4) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0);                // Góc vuông
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0);            // Đáy lớn
                    context.Points[target[2].ToString()] = new Point3D(width * 0.5, height, 0); // Đáy nhỏ
                    context.Points[target[3].ToString()] = new Point3D(0, height, 0);           // Góc vuông
                }
                break;

            // ================= NHÓM TAM GIÁC =================
            case ShapeType.Equilateral_triangle: // Tam giác đều (Các cạnh bằng width)
                if (target.Length >= 3) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[target[2].ToString()] = new Point3D(width / 2.0, width * Math.Sqrt(3) / 2.0, 0); 
                }
                break;

            case ShapeType.Right_triangle: // Tam giác vuông (Vuông tại đỉnh đầu tiên)
                if (target.Length >= 3) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[target[2].ToString()] = new Point3D(0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_triangle: // Tam giác cân (Cân tại đỉnh đầu tiên - target[0])
                if (target.Length >= 3) {
                    // Để đỉnh cân target[0] nằm giữa, ta đặt 2 đỉnh đáy ở target[1] và target[2]
                    context.Points[target[1].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[target[2].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[target[0].ToString()] = new Point3D(width / 2.0, height, 0); 
                }
                break;

            case ShapeType.Isosceles_right_triangle: // Tam giác vuông cân (Vuông cân tại đỉnh đầu tiên)
                if (target.Length >= 3) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[target[2].ToString()] = new Point3D(0, width, 0); // Ép height = width
                }
                break;

            case ShapeType.Triangle: 
            default: // Tam giác thường
                if (target.Length >= 3) {
                    context.Points[target[0].ToString()] = new Point3D(0, 0, 0); 
                    context.Points[target[1].ToString()] = new Point3D(width, 0, 0); 
                    context.Points[target[2].ToString()] = new Point3D(width * 0.3, height, 0); // Lệch 0.3 để ra tam giác thường
                }
                break;
        }

        Console.WriteLine($"[COMPILER] --- GĐ1: Đã dựng {context.Points.Count} điểm mặt đáy ---");
        foreach(var kvp in context.Points) Console.WriteLine($"   -> {kvp.Key}: {kvp.Value}");

        // 3. TỊNH TIẾN TRỌNG TÂM VỀ GỐC TỌA ĐỘ
        if (target.Length > 0)
        {
            var basePoints = new System.Collections.Generic.List<Point3D>();
            foreach (char c in target)
            {
                if (context.Points.TryGetValue(c.ToString(), out var p))
                {
                    Console.WriteLine($"[COMPILER] GĐ2: Di chuyển điểm {c} từ {p}");
                    basePoints.Add(p);
                }
            }

            if (basePoints.Count > 0)
            {
                var centroid = Point3D.GetCentroid(basePoints.ToArray());

                foreach (char c in target)
                {
                    if (context.Points.ContainsKey(c.ToString()))
                    {
                        var p = context.Points[c.ToString()];
                        p.X -= centroid.X;
                        p.Y -= centroid.Y;
                        p.Z -= centroid.Z; 
                    }
                }
            }
        }
    }

    /// <summary>
    /// Hàm trợ giúp: Lấy độ dài cạnh linh hoạt dựa trên vị trí ký tự của Target.
    /// Cho phép tự động dò tìm "AB" hoặc "BA" mà không cần biết chính xác chữ cái là gì.
    /// </summary>
    private double GetDynamicEdgeLength(GeometryProblemDto problem, string target, int idx1, int idx2, double defaultVal, double aValue)
    {
        if (idx1 >= target.Length || idx2 >= target.Length) return defaultVal;

        // Tạo chuỗi cạnh 2 chiều (VD: tìm cả "AB" và "BA")
        string edge1 = $"{target[idx1]}{target[idx2]}"; 
        string edge2 = $"{target[idx2]}{target[idx1]}"; 

        var fact = problem.Facts.FirstOrDefault(f => 
        {
            if (f.Type != FactType.Length) return false;
            var ld = f.GetDataAs<LengthData>();
            return ld != null && (ld.Target == edge1 || ld.Target == edge2);
        });

        if (fact != null && fact.GetDataAs<LengthData>() is LengthData data && data.Value != null) {
            return EvaluateExpression(data.Value, aValue);
        }
        return defaultVal;
    }
    
    private double EvaluateExpression(string expr, double a)
    {
        try {
            // 1. Chuẩn hóa biểu thức (về chữ thường, xóa cách)
            string sanitized = expr.ToLower().Replace(" ", "");
            
            // 2. Tự động thêm dấu nhân '*' vào các cụm như '2a', '3a' (Regex thông minh)
            // Tìm các trường hợp [Số][Chữ a] và thay bằng [Số]*[Chữ a]
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"(\d)a", "$1*a");

            // 3. Xử lý sqrt(...) thủ công trước khi đưa vào DataTable
            while (sanitized.Contains("sqrt("))
            {
                int start = sanitized.IndexOf("sqrt(");
                int end = findMatchingClosingParenthesis(sanitized, start + 4);
                if (end == -1) break;

                string inside = sanitized.Substring(start + 5, end - (start + 5));
                double insideVal = EvaluateExpression(inside, a);
                sanitized = sanitized.Substring(0, start) + Math.Sqrt(insideVal).ToString(System.Globalization.CultureInfo.InvariantCulture) + sanitized.Substring(end + 1);
            }

            // 4. Thay 'a' bằng giá trị thực (Sử dụng Culture Invariant để luôn dùng dấu '.')
            sanitized = sanitized.Replace("a", a.ToString(System.Globalization.CultureInfo.InvariantCulture));
            
            // 5. Tính toán bằng DataTable
            var dt = new System.Data.DataTable();
            return Convert.ToDouble(dt.Compute(sanitized, ""));
        } catch {
            return a; // Fallback mặc định trả về a nếu lỗi
        }
    }

    private int findMatchingClosingParenthesis(string text, int openPos) {
        int closePos = openPos;
        int counter = 1;
        while (counter > 0) {
            char c = text[++closePos];
            if (c == '(') counter++;
            else if (c == ')') counter--;
        }
        return closePos;
    }
}
