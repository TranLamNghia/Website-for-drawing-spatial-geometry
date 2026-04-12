using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Application.Compilers.FactValidators;

public class ShapeValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Shape;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ShapeData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Target)) 
            return ValidationResult.Skip(fact.Id, fact.Type.ToString(), "Dữ liệu Shape rỗng");

        string target = data.Target.ToUpper();
        var targetVertices = System.Text.RegularExpressions.Regex.Matches(target, @"[A-Z][0-9]*'*(?:\.[A-Z][0-9]*'*)?").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        
        // Loại bỏ dấu chấm nếu có trong tên đỉnh (đối với lăng trụ xiên)
        var vertexKeys = targetVertices.SelectMany(v => v.Split('.')).Where(v => !string.IsNullOrEmpty(v)).ToList();

        var points = new List<Domains.MathCore.Point3D>();
        foreach(string v in vertexKeys) {
            var p = context.GetPoint(v);
            if (p != null) points.Add(p);
        }

        if (points.Count < vertexKeys.Count)
            return ValidationResult.Skip(fact.Id, fact.Type.ToString(), $"Chưa dựng đủ đỉnh cho {target}");

        // Kiểm tra Tam giác cân
        if (data.Shape == ShapeType.Isosceles_triangle && vertexKeys.Count == 3)
        {
            double d1 = points[0].DistanceToPoint(points[1]);
            double d2 = points[1].DistanceToPoint(points[2]);
            double d3 = points[2].DistanceToPoint(points[0]);

            // Tam giác cân chỉ cần 2 cạnh bằng nhau, nên ta tìm độ lệch nhỏ nhất giữa các cặp cạnh
            double minDiff = Math.Min(Math.Min(Math.Abs(d1 - d2), Math.Abs(d2 - d3)), Math.Abs(d3 - d1));
            
            if (minDiff < 1e-3)
                return ValidationResult.Pass(fact.Id, "Shape.Isosceles", 0, minDiff);
            else
                return ValidationResult.Fail(fact.Id, "Shape.Isosceles", 0, minDiff);
        }

        // Kiểm tra Tam giác đều
        if (data.Shape == ShapeType.Equilateral_triangle && vertexKeys.Count == 3)
        {
            double d1 = points[0].DistanceToPoint(points[1]);
            double d2 = points[1].DistanceToPoint(points[2]);
            double d3 = points[2].DistanceToPoint(points[0]);

            double maxDiff = Math.Max(Math.Max(Math.Abs(d1 - d2), Math.Abs(d2 - d3)), Math.Abs(d3 - d1));
            
            if (maxDiff < 1e-3)
                return ValidationResult.Pass(fact.Id, "Shape.Equilateral", 0, maxDiff);
            else
                return ValidationResult.Fail(fact.Id, "Shape.Equilateral", 0, maxDiff);
        }
        
        // Kiểm tra Tam giác vuông (kiểm tra định lý Pytago hoặc Tích vô hướng)
        if (data.Shape == ShapeType.Right_triangle && vertexKeys.Count == 3)
        {
            double d1Sq = Math.Pow(points[0].DistanceToPoint(points[1]), 2);
            double d2Sq = Math.Pow(points[1].DistanceToPoint(points[2]), 2);
            double d3Sq = Math.Pow(points[2].DistanceToPoint(points[0]), 2);
            
            var arr = new[] { d1Sq, d2Sq, d3Sq }.OrderBy(x => x).ToArray();
            double diff = Math.Abs(arr[0] + arr[1] - arr[2]);
            
            if (diff < 1e-2)
                return ValidationResult.Pass(fact.Id, "Shape.RightTriangle", 0, diff);
            else
                return ValidationResult.Fail(fact.Id, "Shape.RightTriangle", 0, diff);
        }

        if (data.Shape == ShapeType.Circle || data.Shape == ShapeType.Sphere)
        {
            if (!string.IsNullOrEmpty(data.Center) && context.GetPoint(data.Center) != null)
                return ValidationResult.Pass(fact.Id, $"Shape.{data.Shape}", 0, 0);
        }

        // Tạm thời Skip các hình dạng khác chưa định nghĩa logic đo đạc (Rectangle/Square dễ check nhưng đáy mặc định đã đúng)
        return ValidationResult.Skip(fact.Id, fact.Type.ToString(), $"Chưa cài logic chi tiết để check đo đạc cho {data.Shape}");
    }
}
