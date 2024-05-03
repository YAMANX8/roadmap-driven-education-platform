import { useAuthContext } from "../../auth/hooks";
import { Logo, Switcher, Button } from "../../components";
import { paths } from "../../routes/paths";
import AuthenticatedUserSection from "../components/AuthenticatedUserSection";
import UnauthenticatedUserSection from "../components/UnauthenticatedUserSection";
import SearchForm from "../components/SearchForm";
import { useOffSetTop } from "../../hooks/use-off-set-top";

const Header = () => {
  const { authenticated } = useAuthContext();
  const hasScrolledPastHeight = useOffSetTop(100);
  return (
    <nav
      className={`sticky top-0 z-50 flex w-full justify-between bg-light px-20 py-4 text-dark shadow-lg transition-all duration-1000 ease-in-out-back
       ${hasScrolledPastHeight && "mb-4 bg-light/80 !py-2 duration-300"}`}
    >
      <div>
        <Logo className="w-[150px]" />
      </div>
      <div className="flex items-center gap-[16px]">
        <SearchForm />
        <Button variant="text" page={paths.roadmaps} className="!text-dark">
          Roadmaps
        </Button>
        <Button variant="text" page={paths.main.others} className="!text-dark">
          Become part of Academic compass
        </Button>
        {!authenticated ? (
          <UnauthenticatedUserSection
            loginPath={paths.auth.student.login}
            registerPath={paths.auth.student.register}
          />
        ) : (
          <AuthenticatedUserSection />
        )}
        <Switcher />
      </div>
    </nav>
  );
};

export default Header;
