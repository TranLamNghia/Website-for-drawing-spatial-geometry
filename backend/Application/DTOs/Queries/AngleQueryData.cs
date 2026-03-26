using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs.Queries;

public class AngleQueryData
{
    [JsonPropertyName("angle_type")]
    public AngleType AngleType { get; set; }

    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];
}
