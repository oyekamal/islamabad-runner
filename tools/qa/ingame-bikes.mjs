// Capture one in-game frame per bike, rider on the road, same spot each time.
import { chromium } from 'playwright';
const BIKES = ['default', 'truckart', 'margalla', 'metro', 'lowrider', 'bouncer'];
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const id of BIKES) {
  const p = await b.newPage({ viewport: { width: 450, height: 800 } });
  await p.goto((process.env.BASE || 'http://localhost:5199/'));
  await p.waitForFunction(() => window.__ready);
  await p.evaluate((id) => {
    const g = window.__game;
    g.save.data.unlockedBoards = ['default', 'truckart', 'margalla', 'metro', 'lowrider', 'bouncer'];
    g.save.data.board = id;
    g.save.write();
    g.startRun({ startDistance: 200 });
    window.__ui.showHUD();
  }, id);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `shots/ingame/bike_${id}.png` });
  await p.close();
  console.log('captured', id);
}
await b.close();
