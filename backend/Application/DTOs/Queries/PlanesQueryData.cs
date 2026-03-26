using System.Text.Json.Serialization;

namespace Application.DTOs.Queries;

/// <summary>
/// Use for: cosine_between_planes
/// </summary>
public class PlanesQueryData
{
    [JsonPropertyName("planes")]
    public List<string> Planes { get; set; } = [];
}
