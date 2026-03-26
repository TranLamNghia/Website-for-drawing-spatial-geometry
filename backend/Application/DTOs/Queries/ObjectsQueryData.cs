using System.Text.Json.Serialization;

namespace Application.DTOs.Queries;

/// <summary>
/// Use for: sine_between_line_and_plane, proof_parallel, proof_perpendicular
/// </summary>
public class ObjectsQueryData
{
    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];
}
