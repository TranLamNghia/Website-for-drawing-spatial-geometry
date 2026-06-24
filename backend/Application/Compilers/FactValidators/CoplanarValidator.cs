using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class CoplanarValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Coplanar;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<CoplanarData>();
        var expressions = data?.Points?.ToList() ?? data?.Objects?.ToList();

        if (expressions == null || expressions.Count < 3)
        {
            var fallback = fact.GetDataAs<ObjectsData>();
            expressions = fallback?.Objects?.ToList();
        }

        if (expressions == null || expressions.Count < 3)
            return ValidationResult.Skip(fact.Id, "Coplanar", "Thiếu dữ liệu points/objects");

        var allPoints = expressions
            .SelectMany(expr => FactGeometryHelper.GetPoints(context, expr))
            .ToList();

        if (allPoints.Count < 3)
            return ValidationResult.Skip(fact.Id, "Coplanar", "Chưa có đủ tọa độ để kiểm tra đồng phẳng");

        double diff = FactGeometryHelper.MaxDistanceToPlane(allPoints);

        if (diff <= 0.05)
            return ValidationResult.Pass(fact.Id, "Coplanar", 0, diff);

        return ValidationResult.Fail(fact.Id, "Coplanar", 0, diff);
    }
}
