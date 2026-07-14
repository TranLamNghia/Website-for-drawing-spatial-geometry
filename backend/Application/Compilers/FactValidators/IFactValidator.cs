using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.FactValidators;

public interface IFactValidator
{
    /// <summary>
    /// Identifies which Fact type this validator checks.
    /// </summary>
    FactType TargetFactType { get; }

    /// <summary>
    /// Reverse validation: do the built coordinates satisfy this Fact?
    /// </summary>
    ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength);
}
