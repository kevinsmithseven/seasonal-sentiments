import { Link } from "react-router-dom";
import { pluralize } from "../../utils/helpers"
import { useStoreContext } from "../../utils/GlobalState";
import { ADD_TO_CART, UPDATE_CART_QUANTITY } from "../../utils/actions";
import { idbPromise } from "../../utils/helpers";

function ProductItem(item) {
  const [state, dispatch] = useStoreContext();
  // console.log(item);
  const {
    image,
    name,
    _id,
    price,
    image_url
  } = item;

  const { cart } = state

  const addToCart = () => {
    const itemInCart = cart.find((cartItem) => cartItem._id === _id)
    if (itemInCart) {
      dispatch({
        type: UPDATE_CART_QUANTITY,
        _id: _id,
        purchaseQuantity: parseInt(itemInCart.purchaseQuantity) + 1
      });
      idbPromise('cart', 'put', {
        ...itemInCart,
        purchaseQuantity: parseInt(itemInCart.purchaseQuantity) + 1
      });
    } else {
      dispatch({
        type: ADD_TO_CART,
        product: { ...item, purchaseQuantity: 1 }
      });
      idbPromise('cart', 'put', { ...item, purchaseQuantity: 1 });
    }
  }

  return (
    <div className="card max-w-xs my-5 mx-3 mx-auto px-auto bg-gray-50 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link to={`/products/${_id}`}>
        <img
          alt={name}
          src={`/images/${image}`}
          className="w-full h-36 object-contain"
        />
        <div className="p-3">
          <p className="font-semibold text-md text-gray-800 truncate text-center">{name}</p>
        </div>
      </Link>
      <div>
        <span className="flex justify-center text-xl font-bold">${price}</span>
      </div>
      <button onClick={addToCart} className="w-full bg-[#4d6242] hover:bg-green-500 text-white font-semibold py-2 px-20 rounded-b">Add to cart</button>
    </div>
  );
}

export default ProductItem;
