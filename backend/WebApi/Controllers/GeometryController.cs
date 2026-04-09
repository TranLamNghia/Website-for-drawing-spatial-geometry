using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Application.Compilers;

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
    public async Task<IActionResult> ProcessProblem1([FromBody] System.Text.Json.JsonElement rawJson)
    {
        try
        {
            // Trích xuất phần 'data' từ JSON bạn cung cấp trực tiếp
            var dataElement = rawJson.GetProperty("data");
            var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var dto = System.Text.Json.JsonSerializer.Deserialize<Application.DTOs.GeometryProblemDto>(dataElement.GetRawText(), options);

            if (dto == null)
                return BadRequest(new { message = "Không thể chuyển đổi dữ liệu JSON." });

            // 3. Chạy Geometry Compiler trực tiếp
            var context = _compiler.Compile(dto);
            
            // 4. KIỂM ĐỊNH (FALLBACK MATH SANDBOX NẾU HEURISTIC TẠCH)
            if (context.ValidationReport != null && !context.ValidationReport.AllPassed)
            {
                Console.WriteLine($"[CONTROLLER] Heuristic Compiler tạch {context.ValidationReport.TotalFailed} góc/cạnh. Đang kích hoạt AI SymPy Fallback!");
                
                var solverRequest = new Application.DTOs.MathSolverRequestDto
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
            return Ok(new 
            {
                message = "Biên dịch tọa độ thành công từ JSON trực tiếp!",
                points = context.Points,
                data = dto,
                validation = new 
                {
                    allPassed = context.ValidationReport?.AllPassed ?? true,
                    totalChecked = context.ValidationReport?.TotalChecked ?? 0,
                    totalPassed = context.ValidationReport?.TotalPassed ?? 0,
                    totalFailed = context.ValidationReport?.TotalFailed ?? 0,
                    totalSkipped = context.ValidationReport?.TotalSkipped ?? 0,
                    failures = context.ValidationReport?.Failures.Select(f => new { f.FactId, f.FactType, f.ExpectedValue, f.ActualValue, f.Deviation, f.Message }) ?? Enumerable.Empty<object>()
                }
            });
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

            // 4. KIỂM ĐỊNH LẠI - NẾU LỖI THÌ GOI PYTHON MATH SANDBOX
            if (context.ValidationReport != null && !context.ValidationReport.AllPassed)
            {
                Console.WriteLine($"[CONTROLLER] Đang gửi Request cứu trợ sang AI Math Sandbox...");
                var solverRequest = new Application.DTOs.MathSolverRequestDto
                {
                    ProblemText = problemText,
                    FactsJson = dto,
                    CurrentPoints = context.Points,
                    ValidationFailures = context.ValidationReport.Failures,
                    BaseAValue = context.UnitLength  // Gửi Base_a_value sang Python!
                };

                var newPoints = await _aiService.FallbackSolveMathAsync(solverRequest);
                if (newPoints != null && newPoints.Count > 0)
                {
                    _compiler.RefineWithNewPoints(context, dto, newPoints);
                }
            }
            return Ok(new 
            {
                message = "Biên dịch tọa độ thành công!",
                points = context.Points,
                data = dto,
                validation = new 
                {
                    allPassed = context.ValidationReport?.AllPassed ?? true,
                    totalChecked = context.ValidationReport?.TotalChecked ?? 0,
                    totalPassed = context.ValidationReport?.TotalPassed ?? 0,
                    totalFailed = context.ValidationReport?.TotalFailed ?? 0,
                    totalSkipped = context.ValidationReport?.TotalSkipped ?? 0,
                    failures = context.ValidationReport?.Failures.Select(f => new { f.FactId, f.FactType, f.ExpectedValue, f.ActualValue, f.Deviation, f.Message }) ?? Enumerable.Empty<object>()
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}