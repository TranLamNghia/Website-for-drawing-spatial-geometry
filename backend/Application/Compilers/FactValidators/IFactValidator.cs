using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.FactValidators;

public interface IFactValidator
{
    /// <summary>
    /// Xác định loại Fact mà Validator này chuyên check
    /// </summary>
    FactType TargetFactType { get; }

    /// <summary>
    /// Kiểm tra ngược lại: Tọa độ đã dựng có thỏa mãn Fact này không?
    /// </summary>
    ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength);
}
