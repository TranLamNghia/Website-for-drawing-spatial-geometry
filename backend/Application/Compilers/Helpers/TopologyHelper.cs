using System.Linq;

namespace Application.Compilers.Helpers;

public static class TopologyHelper
{
    /// <summary>
    /// Tìm đoạn thẳng giao tuyến của 2 mặt phẳng dựa trên chữ cái chung.
    /// </summary>
    public static string? GetCommonLine(string plane1, string plane2)
    {
        plane1 = plane1.Replace("(", "").Replace(")", "");
        plane2 = plane2.Replace("(", "").Replace(")", "");

        // Tìm các ký tự xuất hiện ở cả 2 mặt phẳng
        var commonChars = plane1.Intersect(plane2).ToArray();

        // Giao tuyến của 2 mặt phẳng cần ít nhất 2 điểm (2 chữ cái) chung
        if (commonChars.Length >= 2)
        {
            return new string(commonChars.Take(2).ToArray());
        }

        return null;
    }
    
    /// <summary>
    /// Nhận diện Đỉnh của chóp khi biết tên mặt phẳng bên và mặt đáy.
    /// </summary>
    public static string? GetApex(string sidePlane, string basePlane)
    {
        sidePlane = sidePlane.Replace("(", "").Replace(")", "");
        basePlane = basePlane.Replace("(", "").Replace(")", "");

        // Ký tự nào thuộc mặt bên mà KHÔNG thuộc mặt đáy thì chính là Đỉnh chóp
        var apexChars = sidePlane.Except(basePlane).ToArray();
        
        if (apexChars.Length == 1)
            return apexChars[0].ToString();
            
        return null;
    }
}