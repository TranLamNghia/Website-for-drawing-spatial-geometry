'use client'

import { Facebook, Github, Linkedin, Mail, Calendar, MapPin, User2 } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 lg:gap-6">

        {/* Header */}
        <div className="space-y-1.5 pb-2">
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/75 sm:text-3xl">
            Thông tin chủ sở hữu
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Liên hệ với người phát triển trang web.
          </p>
        </div>

        {/* Top Horizontal Line - Gradient from 1ef2e6 to 1e1ef2 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-[#1ef2e6] to-[#1e1ef2]" />

        {/* Profile Details Row */}
        <div className="py-6 flex flex-col md:flex-row gap-10 items-start">

          {/* Left: Square Image Placeholder with Premium Design - Orange Border */}
          <div className="w-[180px] h-[180px] shrink-0 border border-orange-500/40 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-orange-500/8 via-amber-500/3 to-transparent shadow-lg shadow-orange-500/5 backdrop-blur-md group hover:border-orange-500/60 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <User2 className="w-10 h-10 text-orange-500/70 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-[11px] text-orange-500/80 font-bold uppercase tracking-widest mt-2">image</span>
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-4 pt-1">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Trần Lâm Nghĩa</h2>
              <span className="inline-flex items-center text-[12px] font-bold text-[#94d8f6] bg-[#94d8f6]/10 px-3 py-1 rounded-full border border-[#94d8f6]/20">
                Người phát triển & Thiết kế chính
              </span>
            </div>

            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-3xl">
              Xin chào! Tôi là người phát triển chính của Phòng thí nghiệm Hình học AI. Website đang trong quá trình nâng cấp và hoàn thiện tính ổn định. Nếu bạn có bất kỳ thắc mắc, đề xuất hợp tác hoặc câu hỏi kỹ thuật nào, vui lòng liên hệ trực tiếp qua các thông tin bên dưới....
            </p>
          </div>
        </div>

        {/* Middle Horizontal Line - Gradient from 1ef2e6 to 1e1ef2 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-[#1ef2e6] to-[#1e1ef2]" />

        {/* Two Columns Section - Grid with single divider */}
        <div className="py-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-x-12 gap-y-8 items-stretch w-full">

          {/* Column 1: Thông tin cá nhân */}
          <div className="space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500/80 pl-3 mb-6">
                Thông tin cá nhân
              </h3>

              <div className="space-y-5">
                <div className="group">
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Calendar size={14} className="text-emerald-500/80" />
                    <p className="text-[12px] font-bold uppercase tracking-wider">Năm sinh</p>
                  </div>
                  <a href="#" className="text-[13px] text-foreground/90 font-medium hover:text-primary transition-colors block mt-1 pl-5">
                    2004
                  </a>
                </div>

                <div className="group">
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Mail size={14} className="text-emerald-500/80" />
                    <p className="text-[12px] font-bold uppercase tracking-wider">Email</p>
                  </div>
                  <a href="#" className="text-[13px] text-foreground/90 font-medium hover:text-primary transition-colors block mt-1 pl-5">
                    tlnghiajmail@gmail.com
                  </a>
                </div>

                <div className="group">
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <MapPin size={14} className="text-emerald-500/80" />
                    <p className="text-[12px] font-bold uppercase tracking-wider">Quê quán</p>
                  </div>
                  <a href="#" className="text-[13px] text-foreground/90 font-medium hover:text-primary transition-colors block mt-1 pl-5">
                    Quảng Ngãi, Việt Nam
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Column Divider 1 */}
          <div className="hidden md:block w-[1px] bg-gradient-to-b from-[#1ef2e6] via-[#1e1ef2]/50 to-transparent self-stretch" />

          {/* Column 2: Mạng xã hội */}
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500/80 pl-3 mb-6">
              Mạng xã hội
            </h3>

            <div className="space-y-4">
              {/* FB Row */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-9 h-9 border border-primary/15 rounded-xl flex items-center justify-center bg-card shrink-0 shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-md" title="icon">
                  <Facebook className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">fb</p>
                  <a href="https://www.facebook.com/nghia.tranlam.71" target="_blank" rel="noopener noreferrer" className="text-[13px] text-foreground/90 font-semibold hover:text-primary transition-colors truncate block">
                    facebook.com/nghia.tranlam.71
                  </a>
                </div>
              </div>

              {/* GitHub Row */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-9 h-9 border border-primary/15 rounded-xl flex items-center justify-center bg-card shrink-0 shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-md" title="icon">
                  <Github className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">github</p>
                  <a href="https://github.com/TranLamNghia" target="_blank" rel="noopener noreferrer" className="text-[13px] text-foreground/90 font-semibold hover:text-primary transition-colors truncate block">
                    github.com/TranLamNghia
                  </a>
                </div>
              </div>

              {/* LinkedIn Row */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-9 h-9 border border-primary/15 rounded-xl flex items-center justify-center bg-card shrink-0 shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-md" title="icon">
                  <Linkedin className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">linkedin</p>
                  <a href="https://www.linkedin.com/in/nghĩa-trần-lâm-b21a88383" target="_blank" rel="noopener noreferrer" className="text-[13px] text-foreground/90 font-semibold hover:text-primary transition-colors truncate block">
                    linkedin.com/in/nghĩa-trần-lâm-b21a88383
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
