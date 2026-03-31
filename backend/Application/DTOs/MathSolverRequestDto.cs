using System.Text.Json.Serialization;
using Domains.MathCore;

namespace Application.DTOs;

public class MathSolverRequestDto
{
    [JsonPropertyName("problem_text")]
    public string ProblemText { get; set; } = string.Empty;

    [JsonPropertyName("facts_json")]
    public GeometryProblemDto FactsJson { get; set; } = new();

    [JsonPropertyName("current_points")]
    public Dictionary<string, Point3D> CurrentPoints { get; set; } = new();

    [JsonPropertyName("validation_failures")]
    public List<Application.Compilers.FactValidators.ValidationResult> ValidationFailures { get; set; } = new();

    [JsonPropertyName("base_a_value")]
    public double BaseAValue { get; set; } = 5.0;
}
