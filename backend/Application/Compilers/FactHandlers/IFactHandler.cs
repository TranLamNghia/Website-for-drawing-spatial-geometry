using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.FactHandlers;

public interface IFactHandler
{
    // Identifies which Fact type this handler processes
    FactType TargetFactType { get; }

    // Executes the handler logic
    void Handle(FactDto fact, CompilationContext context);
}