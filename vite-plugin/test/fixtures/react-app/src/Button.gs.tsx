// Test fixture: React component in GoodScript

interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button = ({ label, onClick }: ButtonProps) => {
  return (
    <button onClick={onClick} type="button">
      {label}
    </button>
  );
};

export default Button;
