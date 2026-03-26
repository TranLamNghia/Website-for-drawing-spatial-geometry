using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

/// <summary>
/// Use for: perpendicular, parallel, coplanar
/// </summary>
public class ObjectsData
{
    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];
}
