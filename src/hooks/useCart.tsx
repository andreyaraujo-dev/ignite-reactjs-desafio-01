import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue != cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const newCart = [
        ...cart,
      ];

      const [stockAmount, currentAmount] = ([
        await api.get(`stock/${productId}`).then(response => (response.data.amount)),
        newCart.find(product => product.id === productId)?.amount || 0,
      ]);

      if (stockAmount <= currentAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productExists = newCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = currentAmount + 1;
      } else {
        const response = await api.get(`/products/${productId}`);
        const product = response.data;

        newCart.push({
          ...product,
          amount: 1,
        });
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Não foi possível colocar o produto no carrinho.')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((product) => {
        return product.id !== productId;
      });
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Não foi possível remover o item do carrinho.');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartUpdated = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });
      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch {
      toast.error('Não foi possível adicionar mais itens.');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
