import { Link } from 'react-router-dom';
import { VerifiedBadge, IconPlus } from './Icons.jsx';

/**
 * The card from the "Profile Card" Figma file, adapted to the studio theme.
 *
 * variant:
 *  - "stacked"  : image on top, info panel below          (Figma "Left")
 *  - "overlay"  : full-bleed image, frosted info at bottom (Figma "Right" / "Right v2")
 */
export default function ProfileCard({
  image,
  imageAlt = '',
  title,
  verified = true,
  description,
  stats = [],
  action,
  variant = 'overlay',
  className = '',
}) {
  const ActionTag = action?.to ? Link : action?.href ? 'a' : 'button';
  const actionProps = action?.to
    ? { to: action.to }
    : action?.href
      ? { href: action.href, target: action.external ? '_blank' : undefined, rel: action.external ? 'noreferrer' : undefined }
      : { type: 'button', onClick: action?.onClick };

  return (
    <article className={`pcard pcard--${variant} ${className}`}>
      <div className="pcard__media">
        <img src={image} alt={imageAlt} loading="lazy" decoding="async" draggable="false" onContextMenu={(e) => e.preventDefault()} />
        {variant === 'overlay' && <div className="pcard__blur" aria-hidden="true" />}
      </div>

      <div className="pcard__info">
        <h3 className="pcard__name">
          <span>{title}</span>
          {verified && <VerifiedBadge size={22} />}
        </h3>
        {description && <p className="pcard__desc">{description}</p>}

        {(stats.length > 0 || action) && (
          <div className="pcard__footer">
            <div className="pcard__stats">
              {stats.map(({ icon: Icon, value, label }) => (
                <span key={label} className="pcard__stat" title={label}>
                  {Icon && <Icon width={16} height={16} />}
                  <strong>{value}</strong>
                  <span className="sr-only">{label}</span>
                </span>
              ))}
            </div>
            {action && (
              <ActionTag className="pill" {...actionProps}>
                {action.label} {action.icon !== false && (action.icon || <IconPlus width={16} height={16} />)}
              </ActionTag>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
