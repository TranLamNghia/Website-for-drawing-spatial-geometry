using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.QueryHandlers;

public interface IQueryHandler
{
    QueryType TargetQueryType { get; }
    void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context);
}
