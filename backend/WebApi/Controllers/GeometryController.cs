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

    [HttpPost("process")]
    public async Task<IActionResult> ProcessProblem([FromBody] string problemText)
    {
        try
        {
            var dto = await _aiService.ExtractGeometryAsync(problemText);
            
            if (dto == null)
                return BadRequest(new { message = "Không thể trích xuất dữ liệu từ AI Service." });

            var context = _compiler.Compile(dto);
            return Ok(new 
            {
                message = "Biên dịch tọa độ thành công!",
                points = context.Points
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}