using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class CollinearValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Collinear;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<CollinearData>();
        var pointNames = data?.Points?.ToList();

        if (pointNames == null || pointNames.Count < 3)
        {
            var fallback = fact.GetDataAs<ObjectsData>();
            pointNames = fallback?.Objects?.ToList();
        }

        if (pointNames == null || pointNames.Count < 3)
            return ValidationResult.Skip(fact.Id, "Collinear", "Thiếu dữ liệu points/objects");

        var points = pointNames
            .SelectMany(name => FactGeometryHelper.GetPoints(context, name))
            .ToList();

        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Collinear", "Chưa có đủ tọa độ để kiểm tra thẳng hàng");

        if (FactGeometryHelper.AreCollinear(points))
            return ValidationResult.Pass(fact.Id, "Collinear", 0, 0);

        var baseLine = new Line3D(points[0], new Vector3D(points[0], points[1]));
        double diff = points.Skip(2).Max(point => baseLine.DistanceToPoint(point));
        return ValidationResult.Fail(fact.Id, "Collinear", 0, diff);
    }
}
