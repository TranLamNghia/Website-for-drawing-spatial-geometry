using Application.DTOs;
using Domains.MathCore;

namespace Application.Interfaces;

public interface IGeometryExtractionService
{
    Task<GeometryProblemDto?> ExtractGeometryAsync(string problemText);
    Task<MathSolverResponseDto?> FallbackSolveMathAsync(MathSolverRequestDto request);
}