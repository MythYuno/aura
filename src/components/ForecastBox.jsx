import { IcClock } from '../lib/icons.jsx';
import { maskedMoney } from '../lib/format.js';

/**
 * "Previsione fine mese" card.
 * Two columns: cosa spenderai (in totale) | quanto ti resta.
 */
export const ForecastBox = ({ projectedSpend, projectedRemain, privacy, freeBudget }) => {
  // Defensive: never show negatives
  const spend = Math.max(0, Math.round(projectedSpend || 0));
  const remain = Math.round(projectedRemain || 0);
  const tone = remain >= 0 ? 'accent' : 'warn';
  const remainLbl = remain >= 0 ? 'Ti resterà' : 'Sforerai di';
  const remainVal = Math.abs(remain);

  return (
    <div className="forecast-box">
      <div className="lbl">
        <IcClock /> Previsione fine mese
      </div>
      <div className="row">
        <div className="col">
          <div className="col-lbl">Spenderai</div>
          <div className="col-val fg tnum">
            <span className="currency">€</span>{maskedMoney(spend, { privacy })}
          </div>
        </div>
        <div className="col">
          <div className="col-lbl">{remainLbl}</div>
          <div
            className="col-val tnum"
            style={{ color: tone === 'warn' ? 'var(--warn)' : 'var(--accent)' }}
          >
            <span className="currency">€</span>{maskedMoney(remainVal, { privacy })}
          </div>
        </div>
      </div>
    </div>
  );
};
