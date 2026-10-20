// O03 IT: deterministische Zustandsübergänge und neutraler Start.
import { neuesSpiel } from '../src/engine';
import { fuehreAus } from '../src/aktionen';
import { posteingang } from '../src/abfragen';
import {
  ausfallRisiko, generationInCluster, initialisiereIt, itCluster, itDeckel, itProjektPlan,
  itUebersicht, itWoche, SYSTEME,
} from '../src/it';

describe('O03 IT-Systeme', () => {
  it('initialisiert acht Systeme ohne einen einzigen aktiven Eingriff', () => {
    const s=neuesSpiel(1);
    const u=itUebersicht(s);
    expect(u.systeme).toHaveLength(8);
    expect(u.projekte).toHaveLength(0);
    expect(u.systeme.find(x=>x.id==='kasse')).toMatchObject({generation:2,alter:14});
    expect(u.systeme.find(x=>x.id==='preisschilder')?.generation).toBe(0);
    expect(u.systeme.find(x=>x.id==='datenplattform')?.generation).toBe(1);
    const basis=Object.values(SYSTEME).reduce((a,x)=>a+x.kosten,0);
    expect(u.betriebskostenWoche).toBe(basis);
  });

  it('alternde Plattformen fallen häufiger aus', () => {
    expect(ausfallRisiko(1,25)).toBeGreaterThan(ausfallRisiko(1,5));
    expect(ausfallRisiko(2,25)).toBeGreaterThan(ausfallRisiko(3,25));
    expect(ausfallRisiko(0,60)).toBe(0);
  });

  it('Kauf begrenzt die Zielgeneration, Eigenentwicklung erlaubt Generation 4', () => {
    const s=neuesSpiel(2),c=itCluster(s)[0].id;
    expect(fuehreAus(s,{typ:'itProjekt',system:'kasse',art:'kaufen',zielGeneration:4,clusterIds:[c]}).ok).toBe(false);
    expect(fuehreAus(s,{typ:'itProjekt',system:'kasse',art:'dienstleister',zielGeneration:2,clusterIds:[c]}).ok).toBe(false);
    expect(fuehreAus(s,{typ:'itProjekt',system:'kasse',art:'entwickeln',zielGeneration:4,clusterIds:[c]}).ok).toBe(true);
    expect(fuehreAus(s,{typ:'itProjekt',system:'kasse',art:'entwickeln',zielGeneration:4,clusterIds:[c]}).ok).toBe(false);
  });

  it('modernisiert ausschließlich die freigegebenen Cluster und schützt parallele Altgenerationen', () => {
    const s=neuesSpiel(3),clusters=itCluster(s);
    const zuerst=clusters[0],zweites=clusters[1];
    const basis=generationInCluster(s,'planung',zuerst.id);
    const r=fuehreAus(s,{typ:'itProjekt',system:'planung',art:'kaufen',zielGeneration:3,clusterIds:[zuerst.id]});
    expect(r.ok).toBe(true);
    const p=s.it!.projekte[0];
    for(let i=0;i<80&&p.phase!=='abgeschlossen';i++){itWoche(s);s.woche++;}
    expect(p.phase).toBe('abgeschlossen');
    expect(p.kostenIst).toBeGreaterThan(0);
    expect(generationInCluster(s,'planung',zuerst.id)).toBe(3);
    expect(generationInCluster(s,'planung',zweites.id)).toBe(basis);
    expect(s.it!.startprobleme['planung:'+zuerst.id]).toBeDefined();
  });

  it('Planung erlaubt Cluster-Auswahl und Reihenfolge nur vor begonnenem Rollout', () => {
    const s=neuesSpiel(4),c=itCluster(s);
    const r=fuehreAus(s,{typ:'itProjekt',system:'app',art:'dienstleister',zielGeneration:3});
    expect(r.ok).toBe(true);
    const p=s.it!.projekte[0];
    expect(fuehreAus(s,{typ:'itRolloutPlan',projekt:p.id,clusterIds:[c[1].id,c[0].id]}).ok).toBe(true);
    expect(p.clusterIds).toEqual([c[1].id,c[0].id]);
    expect(fuehreAus(s,{typ:'itRolloutPlan',projekt:p.id,clusterIds:[c[1].id,c[1].id]}).ok).toBe(false);
  });

  it('verbessert den bereichsbezogenen IT-Deckel erst nach Rollout', () => {
    const s=neuesSpiel(5),c=itCluster(s);
    const vor=itDeckel(s,'merchandise_planning');
    expect(fuehreAus(s,{typ:'itProjekt',system:'planung',art:'kaufen',zielGeneration:3,clusterIds:c.map(x=>x.id)}).ok).toBe(true);
    const p=s.it!.projekte[0];
    for(let i=0;i<120&&p.phase!=='abgeschlossen';i++){itWoche(s);s.woche++;}
    expect(p.phase).toBe('abgeschlossen');
    expect(itDeckel(s,'merchandise_planning')).toBeGreaterThan(vor);
    expect(itDeckel(s,'merchandise_planning')).toBeLessThanOrEqual(1);
  });

  it('nutzt unabhängigen Zufallsstrom und berechenbare Laufzeiten', () => {
    const s=neuesSpiel(11),t=structuredClone(s);
    const plan=itProjektPlan(s,'kasse','kaufen',3,2);
    expect(plan.gesamt).toBe(plan.konzept+plan.umsetzung+plan.rollout);
    for(let i=0;i<7;i++){itWoche(s);itWoche(t);expect(s.it).toEqual(t.it);s.woche++;t.woche++;}
    expect(s.rng).toBe(t.rng);
  });

  it('meldet Projekte und Meilensteine im IT-Posteingang mit Navigation', () => {
    const s=neuesSpiel(9),c=itCluster(s)[0].id;
    expect(fuehreAus(s,{typ:'itProjekt',system:'app',art:'kaufen',zielGeneration:3,clusterIds:[c]}).ok).toBe(true);
    const post=posteingang(s);
    const eingang=post.handeln.find(e=>e.typ==='it_meilenstein');
    expect(eingang?.bezug?.modul).toBe('it');
    expect(post.meldungen.some(m=>m.kategorie==='IT')).toBe(true);
  });

  it('ist für ältere Spielstände ohne IT-Objekt rückwärtskompatibel', () => {
    const s=neuesSpiel(6);
    delete s.it;
    expect(itDeckel(s,'it')).toBe(1);
    initialisiereIt(s);
    expect(s.it?.projekte).toHaveLength(0);
  });
});
