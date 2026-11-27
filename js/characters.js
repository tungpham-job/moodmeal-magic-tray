/* ═══════════════════════════════════════════════
   characters.js — Nhân vật đồng hành (Học sinh chọn một bạn; lên Level thì tiến hóa)

   - 9 nhân vật gốc có hình vẽ sẵn (SVG), mỗi bạn 4 cấp khớp 4 Level.
   - BGH thêm/sửa/bật tắt nhân vật, đặt tên hình dạng, hình (vẽ sẵn hoặc tải ảnh), hoạt ảnh theo từng Level.
   - Dữ liệu: mm_characters (danh sách nhân vật; chưa lưu thì dùng mặc định); account.characterId (BGH gán
     ở Danh sách tài khoản); mm_char_state ({ [studentId]: { seenLevelIdx } }) nhớ Level con đã thấy.
   Nạp sau js/store.js và js/xp.js.
═══════════════════════════════════════════════ */

/* ── Hình vẽ sẵn (SVG): 9 dòng × 4 cấp ─────────── */
const MM_CHAR_BUILTIN = [
 {id:'la', name:'Lá', desc:'Bạn nhỏ của rau xanh', color:'#4CAF50', dark:'#2E7D32', belly:'#C8E6C9', stages:['Mầm Bé','Lá Nhí','Cây Khỏe','Đại Thụ Xanh']},
 {id:'song', name:'Sóng', desc:'Bạn nhỏ của hải sản', color:'#4FC3F7', dark:'#0277BD', belly:'#E1F5FE', stages:['Giọt Nhỏ','Cá Sóng','Rồng Biển','Thủy Long']},
 {id:'nang', name:'Nắng', desc:'Bạn nhỏ của trái cây', color:'#FFB74D', dark:'#E65100', belly:'#FFF3E0', stages:['Hạt Nắng','Quả Nắng','Cam Lửa','Mặt Trời Vàng']},
 {id:'may', name:'Mây', desc:'Bạn nhỏ của trứng', color:'#CE93D8', dark:'#6A1B9A', belly:'#F3E5F5', stages:['Trứng Mây','Gà Mây','Chim Mây','Phượng Mây']},

 {id:'cu', name:'Củ', desc:'Bạn nhỏ của các loại củ', color:'#F06292', dark:'#AD1457', belly:'#FCE4EC', stages:['Củ Con','Củ Dền','Củ Lực Sĩ','Vua Củ']},
 {id:'dau', name:'Đậu', desc:'Bạn nhỏ của các loại đậu', color:'#AED581', dark:'#558B2F', belly:'#F1F8E9', stages:['Hạt Đậu','Đậu Nhí','Đậu Cuộn','Đậu Thần']},
 {id:'gao', name:'Gạo', desc:'Bạn nhỏ của tinh bột', color:'#FFF3C4', dark:'#A1887F', belly:'#FFFDE7', stages:['Hạt Gạo','Gạo Nón','Gạo Vàng','Kim Long']},
 {id:'bi', name:'Bí', desc:'Bạn nhỏ của rau quả', color:'#EF5350', dark:'#B71C1C', belly:'#FFEBEE', stages:['Cà Con','Cà Chua','Cà Dây','Cà Vương']},
 {id:'lua', name:'Lửa', desc:'Bạn nhỏ của thịt', color:'#FF8A65', dark:'#BF360C', belly:'#FBE9E7', stages:['Tia Lửa','Bếp Nhí','Bếp Hồng','Bếp Trưởng']},
];
function face(cx,cy,s,dark){
  const e=5*s;
  return `<ellipse cx="${cx-9*s}" cy="${cy}" rx="${e*.8}" ry="${e}" fill="#263238"/><ellipse cx="${cx+9*s}" cy="${cy}" rx="${e*.8}" ry="${e}" fill="#263238"/>
  <circle cx="${cx-9*s+1.5*s}" cy="${cy-2*s}" r="${1.6*s}" fill="#fff"/><circle cx="${cx+9*s+1.5*s}" cy="${cy-2*s}" r="${1.6*s}" fill="#fff"/>
  <ellipse cx="${cx-16*s}" cy="${cy+7*s}" rx="${4*s}" ry="${2.6*s}" fill="#FF8A80" opacity=".7"/><ellipse cx="${cx+16*s}" cy="${cy+7*s}" rx="${4*s}" ry="${2.6*s}" fill="#FF8A80" opacity=".7"/>
  <path d="M${cx-4*s} ${cy+7*s} Q${cx} ${cy+11*s} ${cx+4*s} ${cy+7*s}" fill="none" stroke="#263238" stroke-width="${1.8*s}" stroke-linecap="round"/>`;
}
function sparkles(n,col){
  const pos=[[22,26],[100,34],[96,86]];
  return pos.slice(0,n).map((p,i)=>`<path class="sp${i+1}" d="M${p[0]} ${p[1]-6} L${p[0]+2} ${p[1]-2} L${p[0]+6} ${p[1]} L${p[0]+2} ${p[1]+2} L${p[0]} ${p[1]+6} L${p[0]-2} ${p[1]+2} L${p[0]-6} ${p[1]} L${p[0]-2} ${p[1]-2}Z" fill="${col}"/>`).join('');
}
let UID=0;
function star(cx,cy,R,r,fill,dark){let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r:R;p+=(i?'L':'M')+(cx+rad*Math.cos(a)).toFixed(1)+' '+(cy+rad*Math.sin(a)).toFixed(1);}return `<path d="${p}Z" fill="${fill}" stroke="${dark||'#F9A825'}" stroke-width="1.2" stroke-linejoin="round"/>`;}
function creature(sp,stage,SP){ /* stage 0..3; SP = màu riêng cho nhân vật tự thêm (chưa có hình vẽ sẵn) */
  const S=SP||MM_CHAR_BUILTIN.find(x=>x.id===sp), c=S.color, d=S.dark, b=S.belly;
  const r=[24,28,32,36][stage], cy=[80,76,72,68][stage], cx=60;
  let back='', front='', top='';
  const body=`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*.92}" fill="${c}" stroke="${d}" stroke-width="2"/><ellipse cx="${cx}" cy="${cy+r*.35}" rx="${r*.6}" ry="${r*.45}" fill="${b}" opacity=".8"/>`;
  const f=face(cx,cy-r*.1,[.8,.9,1,1.05][stage],d);
  const feet=`<ellipse cx="${cx-r*.5}" cy="${cy+r*.88}" rx="9" ry="5" fill="${d}"/><ellipse cx="${cx+r*.5}" cy="${cy+r*.88}" rx="9" ry="5" fill="${d}"/>`;
  const leaf=(x,y,rot,sz,col)=>`<path d="M0 0 C ${sz*.6} ${-sz*.5} ${sz*.6} ${-sz*1.1} 0 ${-sz*1.5} C ${-sz*.6} ${-sz*1.1} ${-sz*.6} ${-sz*.5} 0 0Z" fill="${col}" stroke="${d}" stroke-width="1.5" transform="translate(${x} ${y}) rotate(${rot})"/>`;
  if(sp==='la'){
    const ty=cy-r*.9;
    if(stage===0) top=leaf(cx,ty+3,0,12,'#81C784');
    if(stage===1) top=leaf(cx,ty+3,-30,14,'#81C784')+leaf(cx,ty+3,30,14,'#66BB6A');
    if(stage===2) top=leaf(cx,ty+3,-50,16,'#81C784')+leaf(cx,ty+3,0,18,'#66BB6A')+leaf(cx,ty+3,50,16,'#81C784')+`<circle cx="${cx}" cy="${ty-26}" r="4" fill="#FFEB3B" stroke="${d}"/>`;
    if(stage===3) top=leaf(cx,ty+3,-70,18,'#81C784')+leaf(cx,ty+3,-35,20,'#66BB6A')+leaf(cx,ty+3,0,22,'#81C784')+leaf(cx,ty+3,35,20,'#66BB6A')+leaf(cx,ty+3,70,18,'#81C784')+`<circle cx="${cx-18}" cy="${ty-16}" r="4.5" fill="#F48FB1" stroke="${d}"/><circle cx="${cx+18}" cy="${ty-16}" r="4.5" fill="#FFEB3B" stroke="${d}"/><circle cx="${cx}" cy="${ty-30}" r="5" fill="#F48FB1" stroke="${d}"/>`;
    if(stage>=2) back=`<path d="M${cx-r} ${cy} q-14 -4 -16 8 q8 6 16 -2Z M${cx+r} ${cy} q14 -4 16 8 q-8 6 -16 -2Z" fill="#81C784" stroke="${d}" stroke-width="1.5"/>`;
  }
  if(sp==='song'){
    if(stage===0) top=`<path d="M${cx} ${cy-r-14} Q${cx+8} ${cy-r-2} ${cx} ${cy-r+4} Q${cx-8} ${cy-r-2} ${cx} ${cy-r-14}Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`;
    if(stage>=1) back+=`<path d="M${cx-r+2} ${cy+4} L${cx-r-12} ${cy-6} L${cx-r-10} ${cy+14}Z M${cx+r-2} ${cy+4} L${cx+r+12} ${cy-6} L${cx+r+10} ${cy+14}Z" fill="${d}" opacity=".85"/>`;
    if(stage>=1) top=`<path d="M${cx-10} ${cy-r+3} Q${cx} ${cy-r-16} ${cx+10} ${cy-r+3}Z" fill="${d}"/>`;
    if(stage>=2) back+=`<path d="M${cx+r-4} ${cy+r*.5} q18 6 16 -14 q-4 10 -16 4Z" fill="${d}"/>`;
    if(stage>=2) top+=`<path d="M${cx-24} ${cy-r-2} q6 -14 12 0 q6 -14 12 0 q6 -14 12 0 q6 -14 12 0" fill="none" stroke="#B3E5FC" stroke-width="3" stroke-linecap="round"/>`;
    if(stage===3) top+=`<circle cx="${cx-30}" cy="${cy-r-4}" r="4" fill="#fff" stroke="${d}"/><circle cx="${cx+32}" cy="${cy-r+2}" r="3.5" fill="#fff" stroke="${d}"/><path d="M${cx-8} ${cy-r-8} L${cx} ${cy-r-24} L${cx+8} ${cy-r-8}Z" fill="#FFD54F" stroke="${d}" stroke-width="1.5"/>`;
  }
  if(sp==='nang'){
    const n=[0,4,8,8][stage]; let rays='';
    for(let i=0;i<n;i++){const a=i*(360/n);rays+=`<path d="M0 ${-r-3} L5 ${-r-14} L-5 ${-r-14}Z" fill="#FFD54F" stroke="${d}" stroke-width="1.2" transform="translate(${cx} ${cy}) rotate(${a})"/>`;}
    back=rays;
    if(stage===0) top=`<path d="M${cx} ${cy-r+2} q-2 -12 8 -16" fill="none" stroke="#66BB6A" stroke-width="3" stroke-linecap="round"/><ellipse cx="${cx+9}" cy="${cy-r-14}" rx="6" ry="3.5" fill="#66BB6A"/>`;
    if(stage>=1) top=`<path d="M${cx} ${cy-r+2} q0 -8 4 -12" fill="none" stroke="#6D4C41" stroke-width="3" stroke-linecap="round"/><ellipse cx="${cx+9}" cy="${cy-r-8}" rx="8" ry="4" fill="#66BB6A" stroke="${d}"/>`;
    if(stage===3) back=`<circle cx="${cx}" cy="${cy}" r="${r+18}" fill="none" stroke="#FFE082" stroke-width="3" stroke-dasharray="3 5"/>`+rays;
  }
  if(sp==='may'){
    if(stage===0) top=`<path d="M${cx-r+2} ${cy-r*.2} L${cx-r*.6} ${cy-r*.45} L${cx-r*.3} ${cy-r*.2} L${cx} ${cy-r*.5} L${cx+r*.3} ${cy-r*.2} L${cx+r*.6} ${cy-r*.45} L${cx+r-2} ${cy-r*.2} Q${cx} ${cy-r*1.5} ${cx-r+2} ${cy-r*.2}Z" fill="#fff" stroke="${d}" stroke-width="1.5"/>`;
    if(stage>=1){const w=[0,14,20,26][stage]; back=`<path d="M${cx-r+2} ${cy-2} q${-w} ${-w*.9} ${-w*1.1} ${w*.3} q${w*.3} ${w*.7} ${w*1.1} ${w*.3}Z M${cx+r-2} ${cy-2} q${w} ${-w*.9} ${w*1.1} ${w*.3} q${-w*.3} ${w*.7} ${-w*1.1} ${w*.3}Z" fill="#fff" stroke="${d}" stroke-width="1.5"/>`;}
    if(stage>=1) top=`<path d="M${cx-6} ${cy-r+1} q6 -14 12 0" fill="#FF8A65" stroke="${d}" stroke-width="1.2"/>`;
    if(stage>=2) top+=`<path d="M${cx} ${cy+2} l0 0" /><path d="M${cx-4} ${cy+3} L${cx} ${cy+9} L${cx+4} ${cy+3}Z" fill="#FFB300" stroke="${d}" stroke-width="1"/>`;
    if(stage===3) top+=`<path d="M${cx-14} ${cy-r+2} q-4 -22 4 -26 M${cx} ${cy-r} q0 -24 0 -30 M${cx+14} ${cy-r+2} q4 -22 -4 -26" fill="none" stroke="#FF8A65" stroke-width="4" stroke-linecap="round"/><path d="M${cx-r-26} ${cy+14} q12 14 24 4 M${cx+r+26} ${cy+14} q-12 14 -24 4" fill="none" stroke="#FFD180" stroke-width="3" stroke-linecap="round"/>`;
  }
  const ty0=cy-r*.9;
  if(sp==='cu'){
    if(stage===0) top=leaf(cx,ty0+3,-20,12,'#81C784')+leaf(cx,ty0+3,20,12,'#66BB6A');
    if(stage===1) top=leaf(cx,ty0+3,-35,15,'#81C784')+leaf(cx,ty0+3,0,17,'#66BB6A')+leaf(cx,ty0+3,35,15,'#81C784');
    if(stage>=2) top=leaf(cx,ty0+3,-55,17,'#81C784')+leaf(cx,ty0+3,-20,20,'#66BB6A')+leaf(cx,ty0+3,20,20,'#81C784')+leaf(cx,ty0+3,55,17,'#66BB6A');
    if(stage>=2) back=`<path d="M${cx-r} ${cy+2} q-16 -10 -14 6 q8 8 14 0Z M${cx+r} ${cy+2} q16 -10 14 6 q-8 8 -14 0Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`;
    if(stage===3) top+=star(cx,ty0-34,7,3,'#FFD54F');
  }
  if(sp==='dau'){
    if(stage===0) top=`<path d="M${cx} ${cy-r+2} q-10 -8 -2 -16 q8 -2 6 6" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;
    if(stage>=1){const w=[0,10,14,18][stage]; back=`<path d="M${cx-r-2} ${cy+6} q-${w} -${w*1.2} -2 -${w*1.8} q${w*.9} ${w*.8} 2 ${w*1.8}Z M${cx+r+2} ${cy+6} q${w} -${w*1.2} 2 -${w*1.8} q-${w*.9} ${w*.8} -2 ${w*1.8}Z" fill="#7CB342" stroke="${d}" stroke-width="1.5"/>`;
      top=`<path d="M${cx} ${cy-r+2} q-12 -6 -6 -16 q10 -4 8 6 M${cx} ${cy-r+2} q12 -6 6 -16 q-10 -4 -8 6" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;}
    if(stage===3) top+=`<circle cx="${cx-34}" cy="${cy-r-6}" r="5" fill="#C5E1A5" stroke="${d}"/><circle cx="${cx+36}" cy="${cy-r+4}" r="5" fill="#C5E1A5" stroke="${d}"/><circle cx="${cx}" cy="${cy-r-26}" r="5" fill="#C5E1A5" stroke="${d}"/>`;
  }
  if(sp==='gao'){
    const hw=[0,24,30,36][stage];
    if(stage===0) top=`<path d="M${cx-8} ${cy-r+3} l-3 -12 M${cx} ${cy-r+1} l0 -15 M${cx+8} ${cy-r+3} l3 -12" stroke="#D4A017" stroke-width="3" stroke-linecap="round"/>`;
    if(stage>=1) top=`<path d="M${cx-hw} ${cy-r*.45} L${cx} ${cy-r-hw*.55} L${cx+hw} ${cy-r*.45}Q${cx} ${cy-r*.2} ${cx-hw} ${cy-r*.45}Z" fill="#F5DEB3" stroke="${d}" stroke-width="1.5"/><path d="M${cx-hw*.5} ${cy-r*.4} L${cx} ${cy-r-hw*.5} M${cx+hw*.5} ${cy-r*.4} L${cx} ${cy-r-hw*.5}" stroke="${d}" stroke-width="1" opacity=".6"/><path d="M${cx-hw*.7} ${cy-r*.3} q${hw*.7} ${r*.45} ${hw*1.4} 0" fill="none" stroke="#E57373" stroke-width="2"/>`;
    if(stage>=2) back=`<path d="M${cx-r*.4} ${cy-r*.2} q-18 -20 -10 -34 M${cx} ${cy-r*.2} q0 -26 0 -40 M${cx+r*.4} ${cy-r*.2} q18 -20 10 -34" fill="none" stroke="#D4A017" stroke-width="3" stroke-linecap="round"/>`;
    if(stage===3) top+=`<ellipse cx="${cx-24}" cy="${cy-r-24}" rx="3" ry="6" fill="#FFD54F"/><ellipse cx="${cx}" cy="${cy-r-32}" rx="3" ry="6" fill="#FFD54F"/><ellipse cx="${cx+24}" cy="${cy-r-24}" rx="3" ry="6" fill="#FFD54F"/>`;
  }
  if(sp==='bi'){
    const cs=[7,10,12,14][stage], cyy=cy-r*.92;
    let calyx=''; const nn=stage===0?5:6; for(let i=0;i<nn;i++){calyx+=`<path d="M0 0 L${cs*.45} ${-cs*1.1} L${-cs*.45} ${-cs*1.1}Z" fill="#66BB6A" stroke="#2E7D32" stroke-width="1" transform="translate(${cx} ${cyy}) rotate(${(i-(nn-1)/2)*(stage===0?32:26)})"/>`;}
    top=calyx+`<path d="M${cx} ${cyy-4} q0 -10 3 -14" stroke="#2E7D32" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if(stage>=2) back=`<path d="M${cx-r} ${cy+2} q-16 -8 -14 6 q8 8 14 0Z M${cx+r} ${cy+2} q16 -8 14 6 q-8 8 -14 0Z" fill="#66BB6A" stroke="#2E7D32" stroke-width="1.5"/>`;
    if(stage>=1) top+=`<path d="M${cx+4} ${cyy-16} q10 -6 12 2 q-8 4 -12 -2" fill="none" stroke="#2E7D32" stroke-width="2"/>`;
    if(stage===3) top+=`<path d="M${cx-13} ${cyy-9} L${cx-14} ${cyy-24} L${cx-7} ${cyy-16} L${cx} ${cyy-28} L${cx+7} ${cyy-16} L${cx+14} ${cyy-24} L${cx+13} ${cyy-9}Z" fill="#FFD54F" stroke="#F57F17" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${cx}" cy="${cyy-14}" r="2.6" fill="#E53935"/><circle cx="${cx-8}" cy="${cyy-12}" r="1.8" fill="#42A5F5"/><circle cx="${cx+8}" cy="${cyy-12}" r="1.8" fill="#66BB6A"/>`;
  }
  if(sp==='lua'){
    const flame=(x,y,h,w,col)=>`<path d="M${x} ${y} Q${x-w} ${y-h*.4} ${x-w*.2} ${y-h} Q${x+w*.1} ${y-h*.6} ${x+w*.9} ${y-h*.7} Q${x+w*1.1} ${y-h*.2} ${x} ${y}Z" fill="${col}" stroke="${d}" stroke-width="1.2"/>`;
    const fy=cy-r*.85;
    if(stage===0) top=flame(cx,fy+3,16,8,'#FFB74D');
    if(stage===1) top=flame(cx-8,fy+3,16,7,'#FFB74D')+flame(cx+8,fy+3,18,8,'#FF9800');
    if(stage===2) top=flame(cx-14,fy+4,18,8,'#FFB74D')+flame(cx,fy+2,26,10,'#FF9800')+flame(cx+14,fy+4,18,8,'#FFB74D');
    if(stage===3) top=flame(cx-22,fy+6,20,8,'#FFB74D')+flame(cx-10,fy+3,28,10,'#FF9800')+flame(cx+4,fy+1,36,12,'#FF7043')+flame(cx+18,fy+4,26,9,'#FF9800')+flame(cx+28,fy+8,18,7,'#FFB74D');
    if(stage>=2) back=`<path d="M${cx-r-2} ${cy+4} q-12 -4 -12 8 q8 4 12 -2Z M${cx+r+2} ${cy+4} q12 -4 12 8 q-8 4 -12 -2Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`;
  }
  if(sp==='sao'){
    if(stage===0) top=star(cx,cy-r-8,8,3.6,'#FFD54F');
    if(stage===1) top=star(cx,cy-r-10,9,4,'#FFD54F')+`<path d="M${cx-30} ${cy-r+2} a9 9 0 1 0 8 12 a7 7 0 1 1 -8 -12Z" fill="#E8EAF6" stroke="${d}" stroke-width="1"/>`;
    if(stage===2) top=star(cx,cy-r-12,10,4.4,'#FFD54F')+star(cx-32,cy-r+6,6,2.6,'#FFE082')+star(cx+32,cy-r+8,6,2.6,'#FFE082');
    if(stage===3) top=star(cx,cy-r-16,13,5.6,'#FFD54F')+star(cx-34,cy-r,7,3,'#FFE082')+star(cx+34,cy-r+2,7,3,'#FFE082')+`<ellipse cx="${cx}" cy="${cy}" rx="${r+22}" ry="${r*.42}" fill="none" stroke="#C5CAE9" stroke-width="2" stroke-dasharray="2 5" transform="rotate(-12 ${cx} ${cy})"/>`;
    if(stage>=2) back=`<path d="M${cx-r} ${cy+4} q-14 -4 -14 8 q8 4 14 -2Z M${cx+r} ${cy+4} q14 -4 14 8 q-8 4 -14 -2Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`;
  }
  /* Gạo cấp 4: Kim Long = Gạo Vàng nâng cấp. Giữ nguyên thân tròn, nón lá, rơm vàng và khuôn mặt; thêm sừng, râu, vảy, đuôi rồng và thân vàng óng */
  let isDragon=false, bodyD='';
  if(sp==='gao' && stage===3){
    isDragon=true;
    const dg='#E65100', hw=36;
    /* sừng nhô ra hai bên nón, đuôi rồng cuộn bên phải, mây dưới chân (vẽ phía sau) */
    back+=`<path d="M${cx-20} 44 C${cx-30} 34 ${cx-38} 30 ${cx-46} 12 C${cx-46} 24 ${cx-40} 22 ${cx-30} 40Z" fill="#8D6E63" stroke="#4E342E" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M${cx+20} 44 C${cx+30} 34 ${cx+38} 30 ${cx+46} 12 C${cx+46} 24 ${cx+40} 22 ${cx+30} 40Z" fill="#8D6E63" stroke="#4E342E" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M${cx+r-6} ${cy+18} C${cx+r+22} ${cy+30} ${cx+r+34} ${cy+6} ${cx+r+20} ${cy-10} C${cx+r+16} ${cy-18} ${cx+r+22} ${cy-24} ${cx+r+30} ${cy-26} C${cx+r+18} ${cy-28} ${cx+r+8} ${cy-20} ${cx+r+10} ${cy-8} C${cx+r+16} ${cy+4} ${cx+r+8} ${cy+14} ${cx+r-6} ${cy+4}Z" fill="#FFC107" stroke="${dg}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M${cx+r+30} ${cy-26} q8 -2 10 -10 q-10 0 -14 8Z M${cx+r+30} ${cy-26} q10 4 16 -2 q-8 -6 -16 2Z" fill="#FF7043" stroke="${dg}" stroke-width="1.2" stroke-linejoin="round"/>
      <g fill="#fff" stroke="#FFE082" stroke-width="1.4" opacity=".95"><ellipse cx="${cx-26}" cy="${cy+r*.9+4}" rx="16" ry="5"/><ellipse cx="${cx+24}" cy="${cy+r*.9+6}" rx="18" ry="5"/></g>`;
    /* thân vàng óng, vảy rồng trên bụng (thay thân kem của Gạo Vàng) */
    bodyD=`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*.92}" fill="#FFE29A" stroke="${dg}" stroke-width="2"/>
      <ellipse cx="${cx}" cy="${cy+r*.35}" rx="${r*.6}" ry="${r*.45}" fill="#FFF8E1" opacity=".9"/>
      <g fill="none" stroke="#FFB300" stroke-width="1.5" stroke-linecap="round"><path d="M${cx-14} ${cy+14} q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0"/><path d="M${cx-10} ${cy+22} q4 5 8 0 q4 5 8 0 q4 5 8 0"/><path d="M${cx-6} ${cy+30} q4 5 6 0 q4 5 6 0"/></g>
      <g fill="#FFC107" stroke="${dg}" stroke-width="1"><path d="M${cx-r+2} ${cy-8} l-8 -4 l2 8 l-8 2 l9 4Z"/><path d="M${cx+r-2} ${cy-8} l8 -4 l-2 8 l8 2 l-9 4Z"/></g>`;
    /* râu rồng bay hai bên má + viên ngọc đỏ trên đỉnh nón */
    top+=`<path d="M${cx-17} ${cy+6} C${cx-34} ${cy+4} ${cx-42} ${cy+16} ${cx-54} ${cy+8}" fill="none" stroke="#FFB300" stroke-width="2.6" stroke-linecap="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M${cx-17} ${cy+6} C${cx-34} ${cy+4} ${cx-42} ${cy+16} ${cx-54} ${cy+8};M${cx-17} ${cy+6} C${cx-34} ${cy+14} ${cx-44} ${cy+4} ${cx-54} ${cy+14};M${cx-17} ${cy+6} C${cx-34} ${cy+4} ${cx-42} ${cy+16} ${cx-54} ${cy+8}"/></path>
      <path d="M${cx+17} ${cy+6} C${cx+34} ${cy+4} ${cx+42} ${cy+16} ${cx+54} ${cy+8}" fill="none" stroke="#FFB300" stroke-width="2.6" stroke-linecap="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M${cx+17} ${cy+6} C${cx+34} ${cy+4} ${cx+42} ${cy+16} ${cx+54} ${cy+8};M${cx+17} ${cy+6} C${cx+34} ${cy+14} ${cx+44} ${cy+4} ${cx+54} ${cy+14};M${cx+17} ${cy+6} C${cx+34} ${cy+4} ${cx+42} ${cy+16} ${cx+54} ${cy+8}"/></path>
      <circle cx="${cx}" cy="${cy-r-hw*.55+2}" r="3.6" fill="#E53935" stroke="#B71C1C" stroke-width="1"><animate attributeName="r" values="3;4.4;3" dur="1.6s" repeatCount="indefinite"/></circle>`;
  }
  /* Cấp 4 (Đại sứ dinh dưỡng): hào quang, vòng ánh sáng và hạt bay quanh nhân vật, mỗi dòng một kiểu hạt */
  let aura='', orbit='', defs='';
  if(stage===3){
    const gid='gl'+(++UID), ox=60, oy=68;
    defs=`<defs><radialGradient id="${gid}"><stop offset="0" stop-color="${sp==='gao'?'#FFD54F':c}" stop-opacity=".6"/><stop offset=".6" stop-color="${sp==='gao'?'#FFD54F':c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;
    aura=`<circle cx="${ox}" cy="${oy}" r="56" fill="url(#${gid})"><animate attributeName="r" values="50;60;50" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".65;1;.65" dur="2.2s" repeatCount="indefinite"/></circle>
      <circle cx="${ox}" cy="${oy}" r="54" fill="none" stroke="${sp==='gao'?'#FFC107':d}" stroke-width="1.4" stroke-dasharray="3 7" opacity=".7"><animateTransform attributeName="transform" type="rotate" from="360 ${ox} ${oy}" to="0 ${ox} ${oy}" dur="14s" repeatCount="indefinite"/></circle>`;
    const part={
      la:`<path d="M0 0 C4 -3 4 -8 0 -11 C-4 -8 -4 -3 0 0Z" fill="#81C784" stroke="#2E7D32" stroke-width="1"/>`,
      song:`<circle r="3.4" fill="#E1F5FE" stroke="#0277BD" stroke-width="1"/>`,
      nang:`<circle r="3.6" fill="#FFD54F" stroke="#E65100" stroke-width="1"/>`,
      may:`<ellipse rx="2.6" ry="5.5" fill="#fff" stroke="#6A1B9A" stroke-width="1" transform="rotate(30)"/>`,
      cu:star(0,0,5,2.2,'#FFD54F'),
      dau:`<circle r="3.6" fill="#C5E1A5" stroke="#558B2F" stroke-width="1"/>`,
      gao:`<ellipse rx="2.4" ry="5" fill="#FFF8E1" stroke="#FFB300" stroke-width="1"/>`,
      bi:`<circle r="3.8" fill="#EF5350" stroke="#B71C1C" stroke-width="1"/>`,
      lua:`<path d="M0 3 Q-4 -2 -1 -7 Q1 -3 3 -4 Q4 0 0 3Z" fill="#FFB74D" stroke="#BF360C" stroke-width=".9"/>`
    }[sp]||'';
    let ps=''; for(let i=0;i<4;i++){const a=i*Math.PI/2; ps+=`<g transform="translate(${(ox+Math.cos(a)*50).toFixed(1)} ${(oy+Math.sin(a)*44).toFixed(1)})">${part}</g>`;}
    orbit=`<g>${ps}<animateTransform attributeName="transform" type="rotate" from="0 ${ox} ${oy}" to="360 ${ox} ${oy}" dur="7s" repeatCount="indefinite"/></g>`;
  }
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${defs}${aura}${back}${feet}${isDragon?bodyD:body}${f}${top}${orbit}${sparkles(stage,'#FFD54F')}</svg>`;
}


/* ── Dữ liệu ─────────────────────────────────── */
const MM_CHAR_ANIMS = [
  { id: 'bounce', label: 'Nhún nhảy' },
  { id: 'float',  label: 'Lơ lửng' },
  { id: 'sway',   label: 'Lắc lư' },
  { id: 'epic',   label: 'Hào quang + nhún' },
];
const MM_CHAR_EFFECTS = [
  { id: 'flash', label: 'Chớp sáng + chữ Lên Level' },
  { id: 'none',  label: 'Không hiệu ứng' },
];
const MM_CHAR_MAX_IMG = 300 * 1024;        // ảnh tải lên tối đa 300 KB
const MM_CHAR_DEFAULT_ANIMS = ['bounce', 'float', 'sway', 'epic'];

/* Màu đậm hơn từ một màu hex (dùng cho viền nhân vật tự thêm) */
function mmDarken(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#546E7A';
  const n = parseInt(m[1], 16);
  const f = v => Math.max(0, Math.round(v * (k || 0.6)));
  return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function mmLighten(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ECEFF1';
  const n = parseInt(m[1], 16);
  const f = v => Math.min(255, Math.round(v + (255 - v) * (k || 0.7)));
  return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* Danh sách Level theo bảng XP & Level của BGH (từ thấp đến cao) */
function mmCharLevels() { return getXpConfig().levels.slice().sort((a, b) => a.level - b.level); }

/* Số thứ tự (0, 1, 2…) của Level trong bảng Level */
function mmCharLevelIdx(levelNumber) {
  const i = mmCharLevels().findIndex(l => l.level === levelNumber);
  return i < 0 ? 0 : i;
}

function mmCharDefaults() {
  const n = mmCharLevels().length;
  return MM_CHAR_BUILTIN.map(s => ({
    id: s.id, name: s.name, desc: s.desc, color: s.color, builtin: true, active: true,
    stages: Array.from({ length: n }, (_, i) => ({
      name: s.stages[Math.min(i, s.stages.length - 1)],
      image: null,
      anim: MM_CHAR_DEFAULT_ANIMS[Math.min(i, 3)],
      effect: i === 0 ? 'none' : 'flash',
    })),
  }));
}

/* Mọi nhân vật (đã lưu hoặc mặc định). includeInactive = false → chỉ nhân vật đang bật */
function mmCharAll(includeInactive) {
  const saved = store.get(MM_KEYS.CHARACTERS, null);
  const list = Array.isArray(saved) && saved.length ? saved : mmCharDefaults();
  return includeInactive ? list : list.filter(c => c.active !== false);
}
function mmCharById(id) { return mmCharAll(true).find(c => c.id === id) || null; }

/* Hình dạng của nhân vật ở Level thứ idx; Level vượt số hình đã khai báo thì dùng hình cuối */
function mmCharStage(ch, idx) { return ch.stages[Math.min(Math.max(idx, 0), ch.stages.length - 1)]; }

/* Ảnh/SVG của nhân vật ở Level thứ idx (HTML) */
function mmCharArt(ch, idx) {
  const st = mmCharStage(ch, idx);
  if (st && st.image) return `<img class="char-img" src="${escHtml(st.image)}" alt="${escHtml(st.name || ch.name)}">`;
  const drawn = Math.min(Math.max(idx, 0), 3);
  const lib = MM_CHAR_BUILTIN.find(s => s.id === ch.id);
  if (lib) return creature(ch.id, drawn);
  const col = ch.color || '#90A4AE';
  return creature('custom', drawn, { color: col, dark: mmDarken(col), belly: mmLighten(col) });
}

/* ── Nhân vật của học sinh ───────────────────────
   BGH gán nhân vật ở Danh sách tài khoản: account.characterId.
   mm_char_state chỉ nhớ Level con đã thấy ({ studentId: { seenLevelIdx } }) để chiếu hoạt ảnh tiến hóa một lần. */
function mmCharStateAll() { return store.get(MM_KEYS.CHAR_STATE, {}); }
function mmCharState(studentId) { return mmCharStateAll()[studentId] || null; }
function mmCharSaveState(studentId, st) {
  const all = mmCharStateAll(); all[studentId] = st; return store.set(MM_KEYS.CHAR_STATE, all);
}

/* Nhân vật BGH đã gán cho học sinh (null nếu chưa gán hoặc nhân vật đã bị xóa) */
function mmCharOf(studentId) {
  const acc = store.get(MM_KEYS.ACCOUNTS, []).find(a => a.id === studentId);
  return acc && acc.characterId ? mmCharById(acc.characterId) : null;
}

/* Coi Level hiện tại là đã thấy (khi BGH gán/đổi nhân vật thì hiện thẳng hình của Level hiện tại, không chiếu hoạt ảnh) */
function mmCharMarkSeen(studentId) {
  return mmCharSaveState(studentId, { seenLevelIdx: mmCharLevelIdx(getLevelInfo(getStudentXp(studentId)).level) });
}

/* Số học sinh đang dùng từng nhân vật: { charId: n } */
function mmCharUsage() {
  const u = {};
  store.get(MM_KEYS.ACCOUNTS, []).forEach(a => { if (a.role === 'student' && a.characterId) u[a.characterId] = (u[a.characterId] || 0) + 1; });
  return u;
}
