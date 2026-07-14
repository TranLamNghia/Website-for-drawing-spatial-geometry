using System;
using System.Collections.Generic;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Main coordinator: scans all Facts and invokes the matching validator.
/// Returns FullValidationReport so GeometryCompiler can decide whether to call SymPy.
/// </summary>
public class FactValidationEngine
{
    private readonly IEnumerable<IFactValidator> _validators;

    public FactValidationEngine(IEnumerable<IFactValidator> validators)
    {
        _validators = validators;
    }

    /// <summary>
    /// Runs full reverse validation on the built coordinates.
    /// </summary>
    public FullValidationReport Validate(GeometryProblemDto problem, CompilationContext context)
    {
        var report = new FullValidationReport();

        // Only validate Facts that have a matching validator (skip Shape, Parallel, Perpendicular...)
        foreach (var fact in problem.Facts)
        {
            var validator = _validators.FirstOrDefault(v => v.TargetFactType == fact.Type);
            
            if (validator != null)
            {
                var result = validator.Validate(fact, context, context.UnitLength);
                report.Results.Add(result);
                Console.WriteLine($"[VALIDATOR] {result.Message}");
            }
        }

        report.TotalChecked = report.Results.Count;
        report.TotalPassed = report.Results.Count(r => r.IsValid && !r.Message.StartsWith("⏭️"));
        report.TotalSkipped = report.Results.Count(r => r.Message.StartsWith("⏭️"));
        report.TotalFailed = report.Results.Count(r => !r.IsValid);
        report.AllPassed = report.TotalFailed == 0;

        Console.WriteLine($"[VALIDATOR] ══════════════════════════════════════════");
        Console.WriteLine($"[VALIDATOR] KẾT QUẢ KIỂM ĐỊNH: {(report.AllPassed ? "✅ TẤT CẢ PASS" : "❌ CÓ SAI SỐ")}");
        Console.WriteLine($"[VALIDATOR]   Đã check: {report.TotalChecked} | Pass: {report.TotalPassed} | Fail: {report.TotalFailed} | Skip: {report.TotalSkipped}");
        
        if (!report.AllPassed)
        {
            Console.WriteLine($"[VALIDATOR] 🔴 Các Fact bị FAIL:");
            foreach (var fail in report.Failures)
            {
                Console.WriteLine($"[VALIDATOR]   → {fail.Message}");
            }
            Console.WriteLine($"[VALIDATOR] ⚡ Cần gọi SymPy Solver để giải lại tọa độ!");
        }
        Console.WriteLine($"[VALIDATOR] ══════════════════════════════════════════");

        return report;
    }
}
