import {Box} from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactElement;
}

const Layout = ({children}: LayoutProps)=>{
  return( 
  <div>
    <Box>
      <Header />
        <Box as="main">
        {children}
        </Box>
      <Footer />
    </Box>
  </div>

)};

export default Layout;