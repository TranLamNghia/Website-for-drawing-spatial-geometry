using System.Text.Json.Serialization;
using System.Collections.Generic;
using Domains.MathCore;

namespace Application.DTOs;

public class MathSolverResponseDto
{
    [JsonPropertyName("points")]
    public Dictionary<string, Point3D>? Points { get; set; }

    [JsonPropertyName("sections")]
    public List<SectionDataDto>? Sections { get; set; }
}
