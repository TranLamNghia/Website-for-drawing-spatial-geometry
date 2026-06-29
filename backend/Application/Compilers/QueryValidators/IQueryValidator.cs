using Application.DTOs;
using Application.DTOs.Enums;
using Application.Compilers.FactValidators;

namespace Application.Compilers.QueryValidators;

public interface IQueryValidator
{
    QueryType TargetQueryType { get; }
    ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength);
}
