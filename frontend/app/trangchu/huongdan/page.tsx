'use client'

import { 
  BookOpen, 
  Sparkles, 
  Users, 
  Compass, 
  HelpCircle, 
  CheckCircle2, 
  Lightbulb, 
  Info, 
  ChevronRight,
  Maximize2,
  Cpu
} from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="w-full px-12 py-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen size={20} className="text-[#1ef2e6]" />
            <span className="text-[11px] font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#1ef2e6] to-[#94d8f6]">
              Tài liệu hướng dẫn
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/75">
            Hướng dẫn sử dụng & Khả năng của hệ thống
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Khám phá cách tối ưu hóa công cụ vẽ và phân tích hình học không gian 3D hỗ trợ bởi trí tuệ nhân tạo.
          </p>
        </div>

        {/* Top Horizontal Line - Gradient from 1ef2e6 to 1e1ef2 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-[#1ef2e6] to-[#1e1ef2]" />

        {/* Introduction Section */}
        <div className="py-4 flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1ef2e6]" />
              Giới thiệu tổng quan về Website
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-4xl">
              Chào mừng bạn đến với <strong>Phòng thí nghiệm Hình học AI</strong> — nền tảng tương tác đột phá giúp biến đổi các bài toán hình học không gian 2D trên giấy thành mô hình 3D trực quan, sống động. Website kết hợp sức mạnh xử lý của công cụ dựng hình WebGL hiện đại với khả năng phân tích ngôn ngữ tự nhiên của AI, giúp người dùng dễ dàng dựng hình, quay quét đa chiều và giải quyết các bài toán không gian phức tạp chỉ trong nháy mắt.
            </p>
          </div>
          
          {/* Decorative Quick Stats Badge */}
          <div className="shrink-0 w-full lg:w-auto border border-primary/10 rounded-2xl p-5 bg-card flex flex-row lg:flex-col gap-4 items-center justify-around lg:justify-center min-w-[240px] shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-black text-[#1ef2e6]">3D</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Không gian trực quan</p>
            </div>
            <div className="hidden lg:block w-full h-[1px] bg-border/60" />
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">AI</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Hỗ trợ vẽ thông minh</p>
            </div>
          </div>
        </div>

        {/* Middle Horizontal Line - Gradient from 1ef2e6 to 1e1ef2 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-[#1ef2e6] to-[#1e1ef2]" />

        {/* Three Columns Section - 5 Columns Grid to house dividers */}
        <div className="py-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_1.2fr_auto_1.2fr] gap-x-10 gap-y-8 items-stretch w-full">
          
          {/* Column 1: Đối tượng sử dụng */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500/80 pl-3 mb-4">
              Đối tượng sử dụng phù hợp
            </h3>
            
            <div className="space-y-4">
              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Users size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Học sinh THPT (Lớp 11 & 12)</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Giúp dễ dàng hình dung các định lý hình học không gian, các góc, khoảng cách, quan hệ song song và vuông góc khó hiểu trên lớp học.
                </p>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Cpu size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Giáo viên Toán học</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Công cụ đắc lực để minh họa bài giảng trực quan, xuất bản vẽ chất lượng cao làm đề thi, bài tập lớn sinh động hơn vẽ bảng phấn truyền thống.
                </p>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Compass size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Người tự học & Nghiên cứu</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Tự do sáng tạo và kiểm tra tính đúng đắn của các mô hình đa diện, thiết diện và hình cầu tự vẽ trong quá trình học tập.
                </p>
              </div>
            </div>
          </div>

          {/* Column Divider 1 */}
          <div className="hidden lg:block w-[1px] bg-gradient-to-b from-[#1ef2e6] via-[#1e1ef2]/50 to-transparent self-stretch" />

          {/* Column 2: Bài toán sử dụng phù hợp */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500/80 pl-3 mb-4">
              Bài toán sử dụng phù hợp
            </h3>
            
            <div className="space-y-4">
              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <CheckCircle2 size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Quan hệ vị trí trong không gian</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Tìm giao tuyến của hai mặt phẳng, giao điểm của đường thẳng và mặt phẳng, các bài toán song song, vuông góc, chứng minh đồng quy.
                </p>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <CheckCircle2 size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Tính toán khoảng cách & Góc</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Tính toán và biểu diễn góc giữa hai đường thẳng, đường thẳng và mặt phẳng, hai mặt phẳng; khoảng cách từ điểm đến mặt phẳng, khoảng cách giữa 2 đường chéo nhau.
                </p>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <CheckCircle2 size={14} className="text-emerald-500/80" />
                  <p className="text-[12px] font-bold uppercase tracking-wider">Khối đa diện & Thiết diện</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-5">
                  Vẽ và tìm thiết diện cắt bởi mặt phẳng đi qua các điểm cho trước hoặc có tính chất song song, vuông góc. Tính thể tích khối chóp, lăng trụ, hộp chữ nhật.
                </p>
              </div>
            </div>
          </div>

          {/* Column Divider 2 */}
          <div className="hidden lg:block w-[1px] bg-gradient-to-b from-[#1ef2e6] via-[#1e1ef2]/50 to-transparent self-stretch" />

          {/* Column 3: Danh sách chức năng */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500/80 pl-3 mb-4">
              Danh sách chức năng hệ thống
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ef2e6] mt-2 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-foreground/90">Vẽ hình qua Prompt (AI)</p>
                  <p className="text-[12px] text-muted-foreground">Nhập câu lệnh mô tả (ví dụ: "chóp tam giác đều S.ABC"), hệ thống sẽ phân tích cấu trúc toán học để dựng hình tự động.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ef2e6] mt-2 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-foreground/90">Chế độ tự vẽ linh hoạt</p>
                  <p className="text-[12px] text-muted-foreground">Tự do khởi tạo điểm, đường thẳng, đa giác, các đường đứt nét (ẩn) và nét liền (thấy) bằng bộ công cụ thủ công trực quan.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ef2e6] mt-2 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-foreground/90">Tương tác Viewport 3D xoay chiều</p>
                  <p className="text-[12px] text-muted-foreground">Kéo thả chuột để xoay hình 360 độ, cuộn để phóng to/thu nhỏ nhằm quan sát thiết diện và các điểm ở góc khuất một cách dễ dàng.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ef2e6] mt-2 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-foreground/90">Tính toán & Giải phụ trợ</p>
                  <p className="text-[12px] text-muted-foreground">Hỗ trợ tính toán giao điểm, góc, khoảng cách số học hiển thị trên bảng điều khiển tương tác trực quan.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Horizontal Line - Gradient from 1ef2e6 to 1e1ef2 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-[#1ef2e6] to-[#1e1ef2]" />

        {/* Tips & Recommendations Section */}
        <div className="py-4 space-y-4">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Mẹo và Hướng dẫn vẽ hiệu quả
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recommendation Card 1 */}
            <div className="border border-border rounded-xl p-5 bg-card/40 hover:border-primary/20 transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Sparkles size={14} />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Cách viết prompt AI dựng hình tối ưu</h4>
              </div>
              <ul className="text-[13.5px] text-muted-foreground space-y-2.5 pl-2 list-none">
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Đặt tên rõ ràng:</strong> Đặt tên các đỉnh bằng chữ cái in hoa (ví dụ: S.ABCD, A&apos;B&apos;C&apos;D&apos;).</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Cung cấp hình dạng đáy:</strong> Nêu rõ hình đáy (ví dụ: đáy hình vuông cạnh a, đáy tam giác vuông cân tại B).</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Đường cao & Góc:</strong> Mô tả đường vuông góc với đáy (ví dụ: &quot;chiều cao SA vuông góc đáy&quot; hoặc &quot;S.ABC là chóp tam giác đều&quot;).</span>
                </li>
              </ul>
            </div>

            {/* Recommendation Card 2 */}
            <div className="border border-border rounded-xl p-5 bg-card/40 hover:border-primary/20 transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#1ef2e6]/10 flex items-center justify-center text-[#1ef2e6] shrink-0">
                  <Maximize2 size={14} />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Sử dụng bổ trợ nét vẽ ẩn / hiện</h4>
              </div>
              <ul className="text-[13.5px] text-muted-foreground space-y-2.5 pl-2 list-none">
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Tính năng tự động đổi nét:</strong> Khi vẽ một đường thẳng đi đằng sau một mặt phẳng kín, hệ thống sẽ tự đổi thành nét đứt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Hiệu chỉnh thủ công:</strong> Nếu tự vẽ, bạn có thể click chọn nét vẽ và đổi thuộc tính <em>nét đứt (hidden)</em> hoặc <em>nét liền (visible)</em> bằng bảng thuộc tính bên cạnh.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-[#1ef2e6] shrink-0" />
                  <span><strong>Lưu ý về phiên bản:</strong> Bản vẽ được lưu tạm thời trong phiên làm việc. Hãy tải xuống hình ảnh nếu bạn muốn sử dụng làm tư liệu giảng dạy/học tập.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
