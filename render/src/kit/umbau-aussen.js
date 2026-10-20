// O08 Umbau: Technikaufbauten auf modernisierten Dächern, ohne Änderung der Baukörper.
export function technikAufDach(S, h, m) {
  if (!h.etagenBau || !m || !(m.hoehe>0)) return;
  const etagen=Object.values(h.etagenBau);
  const aufgeruestet=etagen.some(e=>e.technik?.klima===2 && e.klimaModernisiert===true);
  if (!aufgeruestet) return;
  const {x,z,w,d,hoehe}=m, cx=x+w*0.48,cz=z+d*0.43;
  for (let i=0;i<Math.min(3,Math.ceil(etagen.length/2));i++) {
    const dx=i*3.5;
    S.box(2.4,1.45,2.0,cx+dx,hoehe+0.73,cz,'#c0c9ce');
    S.box(2.65,0.12,2.2,cx+dx,hoehe+1.50,cz,'#687984');
    S.box(1.9,0.12,1.8,cx+dx,hoehe+1.57,cz,'#778894');
    S.box(1.5,0.1,0.15,cx+dx,hoehe+0.9,cz+1.05,'#303d49');
  }
}
