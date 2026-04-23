using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Application.Compilers;
using System.Text.Json;
using System.Linq;
using Application.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeometryController : ControllerBase
{
    private readonly IGeometryExtractionService _aiService;
    private readonly IGeometryCompiler _compiler;

    public GeometryController(IGeometryExtractionService aiService, IGeometryCompiler compiler)
    {
        _aiService = aiService;
        _compiler = compiler;
    }

    [HttpPost("process1")]
    public async Task<IActionResult> ProcessProblem1([FromBody] JsonElement rawJson)
    {
        try
        {
            var dataElement = rawJson.GetProperty("data");
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var dto = JsonSerializer.Deserialize<GeometryProblemDto>(dataElement.GetRawText(), options);

            if (dto == null)
                return BadRequest(new { message = "Không thể chuyển đổi dữ liệu JSON." });

            var context = _compiler.Compile(dto);
            
            if (context.ValidationReport != null && !context.ValidationReport.AllPassed)
            {
                var solverRequest = new MathSolverRequestDto
                {
                    ProblemText = "Tính toán tự động từ ProcessProblem1 (JSON Raw)",
                    FactsJson = dto,
                    CurrentPoints = context.Points,
                    ValidationFailures = context.ValidationReport.Failures,
                    BaseAValue = context.UnitLength
                };

                var newPoints = await _aiService.FallbackSolveMathAsync(solverRequest);
                if (newPoints != null && newPoints.Count > 0)
                {
                    _compiler.RefineWithNewPoints(context, dto, newPoints);
                }
            }

            return Ok(BuildFinalResult(dto, context));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("process")]
    public async Task<IActionResult> ProcessProblem([FromBody] string problemText)
    {
        try
        {
            var dto = await _aiService.ExtractGeometryAsync(problemText);
            if (dto == null)
                return BadRequest(new { message = "Không thể trích xuất dữ liệu từ AI Service." });

            var context = _compiler.Compile(dto);

            if (context.ValidationReport != null && !context.ValidationReport.AllPassed)
            {
                var solverRequest = new MathSolverRequestDto
                {
                    ProblemText = problemText,
                    FactsJson = dto,
                    CurrentPoints = context.Points,
                    ValidationFailures = context.ValidationReport.Failures,
                    BaseAValue = context.UnitLength
                };

                var newPoints = await _aiService.FallbackSolveMathAsync(solverRequest);
                if (newPoints != null && newPoints.Count > 0)
                {
                    _compiler.RefineWithNewPoints(context, dto, newPoints);
                }
            }

            return Ok(BuildFinalResult(dto, context));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private object BuildFinalResult(GeometryProblemDto dto, CompilationContext context)
    {
        var finalSegments = dto.Entities.Segments.Concat(context.GeneratedSegments).ToList();
        var finalQueries = dto.Queries.ToList();

        // 1. Dọn dẹp Segments theo Aliases
        if (context.PointAliases.Any())
        {
            for (int i = 0; i < finalSegments.Count; i++)
            {
                string s = finalSegments[i];
                foreach (var alias in context.PointAliases)
                {
                    if (s.Contains(alias.Key))
                    {
                        s = string.Join("-", s.Split('-').Select(p => p == alias.Key ? alias.Value : p).OrderBy(p => p));
                    }
                }
                finalSegments[i] = s;
            }
            finalSegments = finalSegments.Distinct().ToList();
        }

        // 2. Dọn dẹp Queries
        var cleanedQueries = new System.Collections.Generic.List<object>();
        foreach (var q in finalQueries)
        {
            if (q.Data.ValueKind == JsonValueKind.Object && q.Data.TryGetProperty("target", out var targetProp))
            {
                string target = targetProp.GetString() ?? "";
                foreach (var alias in context.PointAliases)
                {
                    if (target.Contains(alias.Key))
                        target = target.Replace(alias.Key, alias.Value);
                }
                
                var dataMap = JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, object>>(q.Data.GetRawText());
                if (dataMap != null)
                {
                    dataMap["target"] = target;
                    cleanedQueries.Add(new { q.Id, q.Type, q.RawText, data = dataMap });
                    continue;
                }
            }
            cleanedQueries.Add(q);
        }

        // 3. Chuẩn bị đầu ra
        var result = new Dictionary<string, object>
        {
            ["message"] = "Biên dịch tọa độ thành công!",
            ["points"] = context.Points,
            ["segments"] = finalSegments,
            ["planes"] = dto.Entities.Planes
                .Select(p => System.Text.RegularExpressions.Regex.Matches(p, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value.Trim().ToUpper()).ToArray())
                .Where(pts => {
                    if (pts.Length == 0) return false;
                    for(int i=0; i<pts.Length; i++) {
                        if(context.PointAliases.TryGetValue(pts[i], out var newVal)) pts[i] = newVal;
                    }
                    bool exists = context.GeneratedPlanes.Any(gp => 
                        pts.All(pt => gp.Points.Select(gpp => gpp.ToUpper()).Contains(pt)));
                    return !exists;
                })
                .Select(pts => new { 
                    points = pts,
                    color = "#6671d1",
                    density = 15,
                    opacity = 0.1
                }).Concat(context.GeneratedPlanes.Select(p => new {
                    points = p.Points,
                    color = p.Color,
                    density = p.Density,
                    opacity = p.Opacity
                })),
            ["circles"] = context.Circles.Select(c => {
                var displayCenter = c.Center;
                if (context.PointAliases.TryGetValue(c.Center, out var newName))
                    displayCenter = newName;
                    
                return new { 
                    center = displayCenter, 
                    radius = Math.Round(c.Radius, 4), 
                    normal = c.Normal != null ? string.Join(",", c.Normal.Select(n => Math.Round(n, 2))) : "0,0,1" 
                };
            }).GroupBy(c => new { c.center, c.radius, c.normal }).Select(g => {
                var first = g.First();
                return new { 
                    center = first.center, 
                    radius = first.radius, 
                    normal = first.normal.Split(',').Select(double.Parse).ToArray() 
                };
            }),
            ["spheres"] = context.Spheres.Select(s => {
                var displayCenter = s.Center;
                if (context.PointAliases.TryGetValue(s.Center, out var newName))
                    displayCenter = newName;

                return new { center = displayCenter, radius = Math.Round(s.Radius, 4) };
            }).GroupBy(s => new { s.center, s.radius }).Select(g => g.First()),
            ["queries"] = cleanedQueries,
            ["validation"] = new 
            {
                allPassed = context.ValidationReport?.AllPassed ?? true,
                totalChecked = context.ValidationReport?.TotalChecked ?? 0,
                totalPassed = context.ValidationReport?.TotalPassed ?? 0,
                totalFailed = context.ValidationReport?.TotalFailed ?? 0,
                totalSkipped = context.ValidationReport?.TotalSkipped ?? 0,
                failures = context.ValidationReport?.Failures.Select(f => new { f.FactId, f.FactType, f.ExpectedValue, f.ActualValue, f.Deviation, f.Message }) ?? Enumerable.Empty<object>()
            }
        };

        // Cross-section data (nếu có)
        if (context.ClippingPlane != null)
        {
            result["clippingPlane"] = new
            {
                a = Math.Round(context.ClippingPlane.A, 6),
                b = Math.Round(context.ClippingPlane.B, 6),
                c = Math.Round(context.ClippingPlane.C, 6),
                d = Math.Round(context.ClippingPlane.D, 6),
                crossSectionVertices = context.ClippingPlane.CrossSectionVertices
            };
        }

        if (context.PointSides.Any())
        {
            result["pointSides"] = context.PointSides.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.ToString().ToLower()
            );
        }

        return result;
    }
}