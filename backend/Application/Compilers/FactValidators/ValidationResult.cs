namespace Application.Compilers.FactValidators;

/// <summary>
/// Kết quả kiểm định của từng Fact riêng lẻ
/// </summary>
public class ValidationResult
{
    public string FactId { get; set; } = string.Empty;
    public string FactType { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public double ExpectedValue { get; set; }
    public double ActualValue { get; set; }
    public double Deviation { get; set; } // Độ lệch tuyệt đối
    public string Message { get; set; } = string.Empty;

    public static ValidationResult Pass(string factId, string factType, double expected, double actual)
    {
        return new ValidationResult
        {
            FactId = factId,
            FactType = factType,
            IsValid = true,
            ExpectedValue = expected,
            ActualValue = actual,
            Deviation = Math.Abs(expected - actual),
            Message = $"✅ {factType} [{factId}]: Kỳ vọng={expected:F4}, Thực tế={actual:F4} → PASS"
        };
    }

    public static ValidationResult Fail(string factId, string factType, double expected, double actual)
    {
        return new ValidationResult
        {
            FactId = factId,
            FactType = factType,
            IsValid = false,
            ExpectedValue = expected,
            ActualValue = actual,
            Deviation = Math.Abs(expected - actual),
            Message = $"❌ {factType} [{factId}]: Kỳ vọng={expected:F4}, Thực tế={actual:F4}, Lệch={Math.Abs(expected - actual):F4} → FAIL"
        };
    }

    public static ValidationResult Skip(string factId, string factType, string reason)
    {
        return new ValidationResult
        {
            FactId = factId,
            FactType = factType,
            IsValid = true, // Skip coi như pass (không đủ dữ liệu để check)
            Message = $"⏭️ {factType} [{factId}]: Bỏ qua - {reason}"
        };
    }
}

/// <summary>
/// Kết quả tổng hợp của toàn bộ quá trình kiểm định
/// </summary>
public class FullValidationReport
{
    public bool AllPassed { get; set; }
    public int TotalChecked { get; set; }
    public int TotalPassed { get; set; }
    public int TotalFailed { get; set; }
    public int TotalSkipped { get; set; }
    public List<ValidationResult> Results { get; set; } = new();
    public List<ValidationResult> Failures => Results.Where(r => !r.IsValid).ToList();
}
