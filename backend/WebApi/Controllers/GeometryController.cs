using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeometryController : ControllerBase
{
    private readonly IGeometryExtractionService _aiService;

    public GeometryController(IGeometryExtractionService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("process")]
    public async Task<IActionResult> ProcessProblem([FromBody] string problemText)
    {
        try
        {
            var dto = await _aiService.ExtractGeometryAsync(problemText);
            
            // Ở bước sau, bạn sẽ ném cái 'dto' này vào GeometryCompiler.
            // Tạm thời trả về OK để test xem parse JSON thành công chưa.
            return Ok(dto); 
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}