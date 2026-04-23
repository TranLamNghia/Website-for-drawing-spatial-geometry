using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Ràng buộc: Góc (đường-đường, đường-mp, mp-mp)
/// VD: "Góc giữa SA và (ABCD) bằng 60 độ"
/// </summary>
public class AngleValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Angle;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<AngleData>();
        if (data == null || data.Objects == null || data.Objects.Count < 2 || string.IsNullOrEmpty(data.Value))
            return ValidationResult.Skip(fact.Id, "Angle", "Thiếu dữ liệu objects/value");

        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        double actualAngle = -1;

        switch (data.AngleType)
        {
            case AngleType.line_line:
            {
                var line1 = context.GetLine(obj1);
                var line2 = context.GetLine(obj2);
                if (line1 == null || line2 == null)
                    return ValidationResult.Skip(fact.Id, "Angle", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

                var v1 = line1.Direction;
                var v2 = line2.Direction;

                string? commonPoint = FindCommonPoint(obj1, obj2);
                if (!string.IsNullOrEmpty(commonPoint))
                {
                    if (obj1.EndsWith(commonPoint)) 
                        v1 = new Domains.MathCore.Vector3D(0, 0, 0) - v1;

                    if (obj2.EndsWith(commonPoint)) 
                        v2 = new Domains.MathCore.Vector3D(0, 0, 0) - v2;
                }

                double dot = v1.DotProduct(v2);
                double mags = v1.Magnitude() * v2.Magnitude();
                
                if (mags >= 1e-9)
                {
                    double cosTheta = Math.Clamp(dot / mags, -1.0, 1.0);
                    actualAngle = Math.Acos(cosTheta) * (180.0 / Math.PI);
                }
                else actualAngle = 0;

                break;
            }
            case AngleType.line_plane:
            {
                var line = context.GetLine(obj1.Length <= 2 ? obj1 : obj2);
                var plane = context.GetPlane(obj1.Length >= 3 ? obj1 : obj2);
                if (line == null || plane == null)
                    return ValidationResult.Skip(fact.Id, "Angle", $"Chưa có đủ tọa độ cho line/plane");
                actualAngle = plane.AngleWithLine(line);
                break;
            }
            case AngleType.plane_plane:
            {
                var plane1 = context.GetPlane(obj1);
                var plane2 = context.GetPlane(obj2);
                if (plane1 == null || plane2 == null)
                    return ValidationResult.Skip(fact.Id, "Angle", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");
                actualAngle = plane1.AngleWithPlane(plane2);
                break;
            }
            default:
                return ValidationResult.Skip(fact.Id, "Angle", $"AngleType '{data.AngleType}' chưa được hỗ trợ");
        }

        double expectedAngle = double.TryParse(data.Value, out double v) ? v : -1;
        if (expectedAngle < 0)
            return ValidationResult.Skip(fact.Id, "Angle", $"Không parse được value '{data.Value}'");

        double tolerance = 0.5; // Sai số 0.5 độ
        if (Math.Abs(expectedAngle - actualAngle) <= tolerance)
        {
            return ValidationResult.Pass(fact.Id, "Angle", expectedAngle, actualAngle);
        }

        return ValidationResult.Fail(fact.Id, "Angle", expectedAngle, actualAngle);
    }

    private string? FindCommonPoint(string obj1, string obj2)
    {
        if (string.IsNullOrEmpty(obj1) || string.IsNullOrEmpty(obj2)) return null;
        
        var v1 = System.Text.RegularExpressions.Regex.Matches(obj1, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        var v2 = System.Text.RegularExpressions.Regex.Matches(obj2, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        return v1.FirstOrDefault(p => v2.Contains(p));
    }
}
