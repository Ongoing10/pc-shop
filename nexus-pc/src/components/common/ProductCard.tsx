import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StarFilled } from '@ant-design/icons';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { BsArrowLeftRight } from 'react-icons/bs';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useCompare } from '../../context/CompareContext';
import { calculateDiscountPercent, formatCurrency, getCategoryName } from '../../utils/format';

interface ProductCardProps {
  product: Product;
}

const LOW_STOCK = 5;

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isComparing, toggleCompare } = useCompare();

  const isLiked = isFavorite(product.id);
  const isCompared = isComparing(product.id);
  const discount = calculateDiscountPercent(product.price, product.oldPrice);
  const outOfStock = product.stock <= 0;
  const stockClass = outOfStock ? 'out' : product.stock <= LOW_STOCK ? 'low' : '';
  const stockLabel = outOfStock
    ? t('common.outOfStock', 'Hết hàng')
    : t('common.stockShort', { count: product.stock, defaultValue: `Còn ${product.stock}` });

  return (
    <article className="product" data-testid={`product-card-${product.id}`}>
      <div className="pimg">
        <div className="badges">
          {discount > 0 && <span className="badge sale">-{discount}%</span>}
          {product.tag && <span className="badge">{product.tag}</span>}
        </div>
        <Link to={`/product/${product.id}`} tabIndex={-1} aria-hidden="true">
          <img src={product.image} alt="" loading="lazy" />
        </Link>
        <button
          className={`fav ${isLiked ? 'liked' : ''}`}
          onClick={() => toggleFavorite(product.id)}
          aria-label={isLiked ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          aria-pressed={isLiked}
          type="button"
        >
          {isLiked ? <FaHeart /> : <FiHeart />}
        </button>
        <button
          type="button"
          className="compare-toggle"
          aria-pressed={isCompared}
          aria-label={`${t('common.compare', 'So sánh')}: ${product.name}`}
          title={t('common.compare', 'So sánh')}
          onClick={() => toggleCompare(product.id)}
        >
          <BsArrowLeftRight aria-hidden="true" />
        </button>
      </div>

      <div className="pbody">
        <div className="pmeta">
          <span className="pcat">{getCategoryName(product.category)}</span>
          <span className="rating">
            <StarFilled aria-hidden="true" /> <b>{product.rating}</b>
            <span>({product.reviews})</span>
          </span>
        </div>
        <Link className="pname" to={`/product/${product.id}`}>
          {product.name}
        </Link>
        <div className="specs">
          {product.specs.slice(0, 3).map((spec) => (
            <span key={spec}>{spec}</span>
          ))}
        </div>
        <div className="pprice">
          <strong>{formatCurrency(product.price)}</strong>
          {discount > 0 && <del>{formatCurrency(product.oldPrice!)}</del>}
        </div>
        <div className="pfoot">
          <span className={`stock ${stockClass}`}>{stockLabel}</span>
          <button
            type="button"
            className="add-cart"
            onClick={() => addToCart(product, 1)}
            disabled={outOfStock}
            aria-label={`${t('common.addToCart', 'Thêm vào giỏ')}: ${product.name}`}
            title={t('common.addToCart', 'Thêm vào giỏ')}
          >
            <FiShoppingCart aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
