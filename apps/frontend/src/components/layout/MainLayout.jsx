const blendZilaLogo = '/BlendZila-noBg.png';
import * as authService from '@app/pages/auth/authService';
import { api, useGetTeacherMeQuery, useGetUserMeQuery } from '@app/redux/api';
import { replaceDiacritics } from '@app/utils/common.util';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AvTimerIcon from '@mui/icons-material/AvTimer';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import MenuIcon from '@mui/icons-material/Menu';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SchoolIcon from '@mui/icons-material/School';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { Button, Container, ListItemButton, Stack, Tooltip, useMediaQuery } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { styled } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ThemeModeContext } from '../../contexts/ThemeModeContext';
import ProfileMenu from './profile-menu.component';
import TeamSwitcher from './TeamSwitcher';
const drawerWidth = 240;
const collapsedDrawerWidth = 65;

// Animation constants
const animationDuration = '300ms'; // for CSS
const animationDurationMs = 300; // for JS/props
const customEasing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Material Design recommended easing

// Styled components with optimized transitions
const SmoothDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    transition: `
      width ${animationDuration} ${customEasing},
      transform ${animationDuration} ${customEasing}
    `,
    willChange: 'width, transform',
    overflowX: 'hidden',
    boxShadow: theme.shadows[4],
    borderRight: 'none',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    contain: 'strict'
  }
}));

const SmoothBox = styled(Box)({
  transition: `margin ${animationDuration} ${customEasing}, width ${animationDuration} ${customEasing}`,
  willChange: 'margin, width',
  transform: 'translateZ(0)'
});

const LogoContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'drawerCollapsed'
})(({ drawerCollapsed }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: drawerCollapsed ? 90 : 160,
  minHeight: drawerCollapsed ? 90 : 160,
  overflow: 'hidden',
  transition: `height 300ms cubic-bezier(0.4, 0, 0.2, 1), min-height 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
  willChange: 'height',
  position: 'relative',
  '& img': {
    position: 'absolute',
    transition: `
      opacity ${animationDuration} ${customEasing},
      transform ${animationDuration} ${customEasing}
    `,
    willChange: 'opacity, transform',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    pointerEvents: 'none' // Prevent image reloading on interactions
  }
}));

// Memoized logo component to prevent reloading
const Logo = React.memo(({ expanded, collapsed, drawerCollapsed }) => (
  <>
    <img
      src={expanded}
      alt="BlendZila logo"
      loading="eager"
      style={{
        height: '150px',
        width: 'auto',
        opacity: drawerCollapsed ? 0 : 1,
        transform: drawerCollapsed ? 'translateX(-100%)' : 'translateX(0)'
      }}
      draggable={false}
    />
    <img
      src={collapsed}
      alt="BlendZila logo collapsed"
      loading="eager"
      style={{
        height: '80px',
        width: 'auto',
        opacity: drawerCollapsed ? 1 : 0,
        transform: drawerCollapsed ? 'translateX(0)' : 'translateX(100%)'
      }}
      draggable={false}
    />
  </>
));
Logo.displayName = 'Logo';
Logo.propTypes = {
  expanded: PropTypes.string.isRequired,
  collapsed: PropTypes.string.isRequired,
  drawerCollapsed: PropTypes.bool.isRequired
};

const SectionHeader = React.memo(({ title, collapsed }) => (
  <Typography
    variant="overline"
    component="div"
    sx={{
      px: collapsed ? 1 : 2,
      py: 1,
      color: 'text.secondary',
      fontWeight: 'bold',
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08333em',
      textAlign: collapsed ? 'center' : 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transition: `all ${animationDuration} ${customEasing}`,
      willChange: 'opacity, transform',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    }}
  >
    {collapsed ? title.charAt(0) : title}
  </Typography>
));
SectionHeader.displayName = 'SectionHeader';

const NavItem = styled(ListItemButton)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  transition: `
    background-color 150ms ease,
    padding-left ${animationDuration} ${customEasing},
    padding-right ${animationDuration} ${customEasing}
  `,
  willChange: 'padding, transform',
  backfaceVisibility: 'hidden',
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  '&.active': {
    backgroundColor: theme.palette.action.selected
  }
}));

const MainLayout = ({ children }) => {
  const matched = useMediaQuery('(min-width:900px)');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { mode, toggleThemeMode } = React.useContext(ThemeModeContext);

  // Get user from localStorage first to determine type
  const storedUser = authService.getUserFromStorage();
  const isTeacherFromStorage = storedUser?.isTeacher === true;

  // Fetch user or teacher data based on localStorage info
  const { data: user } = useGetUserMeQuery(undefined, {
    skip: isTeacherFromStorage
  });

  const { data: teacher } = useGetTeacherMeQuery(undefined, {
    skip: !isTeacherFromStorage
  });

  const [drawerCollapsed, setDrawerCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [profileMenuAnchorEl, setProfileAnchorEl] = React.useState(null);
  const profileMenuOpen = Boolean(profileMenuAnchorEl);

  React.useEffect(() => {
    // Check for user or teacher in local storage
    const storedUser = localStorage.getItem('user');
    let isLoggedIn = false;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && (parsed._id || parsed.isTeacher)) {
          isLoggedIn = true;
        }
      } catch {
        // Invalid JSON, treat as not logged in
      }
    }
    if (!user && !isLoggedIn) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  DrawerContent.propTypes = {
    drawerCollapsed: PropTypes.bool.isRequired,
    mode: PropTypes.string.isRequired,
    adminOptions: PropTypes.array.isRequired
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const toggleDrawerCollapse = () => {
    setDrawerCollapsed((prev) => !prev);
  };

  const openProfileMenu = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const closeProfileMenu = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = async () => {
    authService.removeUserFromStorage();
    authService.removeTokenFromStorage();
    // Clear all RTK Query cache to prevent stale data when switching users
    dispatch(api.util.resetApiState());
    // Clear localStorage subject selection
    localStorage.removeItem('currentSubjectId');
    closeProfileMenu();
    navigate('/auth/login');
  };

  let drawerOption = [];
  let adminOptions = [];

  // All users (both admin and non-admin) see the same menu with Dashboard
  if (!teacher) {
    drawerOption = drawerOption.concat([
      { isHeader: true, title: 'Obsah' },
      // { title: 'Moduly', navTo: '/moduls', icon: <ViewModuleIcon /> },
      { title: 'Dashboard', navTo: '/', icon: <DashboardIcon /> },
      { title: 'Projekty', navTo: '/projects', icon: <AccountTreeIcon /> },
      { title: 'Fórum', navTo: '/forum', icon: <ViewModuleIcon /> }
    ]);
  } else {
    // Teachers have their own Dashboard
    drawerOption = drawerOption.concat([
      { isHeader: true, title: 'Obsah' },
      { title: 'Dashboard', navTo: '/teacher-dashboard', icon: <DashboardIcon /> },
      { title: 'Projekty', navTo: '/projects', icon: <AccountTreeIcon /> },
      { title: 'Fórum', navTo: '/forum', icon: <ViewModuleIcon /> }
    ]);
  }

  // Questions section
  if (user && !teacher) {
    // All users (admin or not) see "Moje otázky"
    drawerOption.push({
      title: 'Moje otázky',
      navTo: '/my-questions',
      icon: <QuestionAnswerIcon />
    });
  } else if (teacher) {
    drawerOption.push({
      title: 'Všetky otázky',
      navTo: '/all-users-questions',
      icon: <QuestionAnswerIcon />
    });
  }

  drawerOption = drawerOption.concat([{ title: 'Testy', navTo: '/tests', icon: <AvTimerIcon /> }]);

  // Admin section - ONLY for teachers (not for user.isAdmin)
  if (teacher) {
    adminOptions.push(
      { isHeader: true, title: 'Správca' },
      { title: 'Používatelia', navTo: '/admin/users', icon: <GroupIcon /> },
      { title: 'Predmety', navTo: '/subjects', icon: <SchoolIcon /> }
    );
  }

  const currentDrawerWidth = drawerCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', width: '100vw', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          transition: `margin ${animationDuration} ${customEasing}, width ${animationDuration} ${customEasing}`,
          willChange: 'margin, width'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={toggleDrawerCollapse}
            sx={{ mr: 2, display: { xs: 'none', md: 'flex' } }}
          >
            {drawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>

          <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            Otázkový systém
          </Typography>
          <Button color="inherit" onClick={openProfileMenu} startIcon={<AccountCircleIcon />}>
            {matched &&
              (() => {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                  try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed.isTeacher && parsed.fullName) {
                      return replaceDiacritics(parsed.fullName);
                    } else if (parsed.name && parsed.surname) {
                      return replaceDiacritics(parsed.name + ' ' + parsed.surname);
                    }
                  } catch {
                    // Invalid JSON, return empty string
                  }
                }
                return '';
              })()}
          </Button>

          <ProfileMenu
            open={profileMenuOpen}
            anchorEl={profileMenuAnchorEl}
            onLogout={handleLogout}
            onClose={closeProfileMenu}
          />
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { md: currentDrawerWidth },
          flexShrink: { md: 0 },
          transition: `width ${animationDuration} ${customEasing}`,
          willChange: 'width'
        }}
        aria-label="nav menu"
      >
        <SmoothDrawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true,
            BackdropProps: {
              transitionDuration: animationDurationMs
            }
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth
            }
          }}
        >
          <DrawerContent drawerCollapsed={false} mode={mode} adminOptions={adminOptions} />
        </SmoothDrawer>
        <SmoothDrawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'flex' },
            '& .MuiDrawer-paper': {
              width: currentDrawerWidth
            }
          }}
          open
        >
          <DrawerContent
            drawerCollapsed={drawerCollapsed}
            mode={mode}
            adminOptions={adminOptions}
          />
        </SmoothDrawer>
      </Box>
      <SmoothBox
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          willChange: 'margin, width'
        }}
      >
        <Toolbar />
        <Container maxWidth={false} sx={{ px: 0 }}>
          {children}
        </Container>
      </SmoothBox>
    </Box>
  );

  function DrawerContent({ drawerCollapsed, mode, adminOptions }) {
    const currentLogoExpanded = blendZilaLogo;
    const currentLogoCollapsed = blendZilaLogo;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <LogoContainer drawerCollapsed={drawerCollapsed}>
          <Link
            to="/"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              padding: '5px'
            }}
          >
            <Logo
              expanded={currentLogoExpanded}
              collapsed={currentLogoCollapsed}
              drawerCollapsed={drawerCollapsed}
            />
          </Link>
        </LogoContainer>

        <Stack justifyContent="space-between" direction="column" flexGrow={2} sx={{ overflow: 'hidden' }}>
          <List component="nav" dense sx={{ overflow: 'hidden' }}>
            <Box
              sx={{
                px: 1.5,
                mt: 'auto',
                mb: 1,
                transition: `all ${animationDuration} ${customEasing}`,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
            >
              <Box
                sx={{
                  flexDirection: 'column',
                  display: 'flex',
                  justifyContent: drawerCollapsed ? 'center' : 'flex-start',
                  width: '100%'
                }}
              >
                {!drawerCollapsed && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1,
                      transition: `opacity ${animationDuration} ${customEasing}`,
                      opacity: drawerCollapsed ? 0 : 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    Zvoľ predmet:
                  </Typography>
                )}
                <TeamSwitcher collapsed={drawerCollapsed} />
              </Box>
            </Box>
            {drawerOption.map((item, index) => {
              if (item.isHeader) {
                return (
                  <React.Fragment key={`header-${index}`}>
                    {!drawerCollapsed && (
                      <SectionHeader title={item.title} collapsed={drawerCollapsed} />
                    )}
                  </React.Fragment>
                );
              }

              return (
                <ListItem key={item.title} disablePadding sx={{ overflow: 'hidden' }}>
                  <Tooltip title={drawerCollapsed ? item.title : ''} placement="right">
                    <NavItem
                      component={NavLink}
                      to={item.navTo}
                      sx={{
                        pl: drawerCollapsed ? '20px' : '16px',
                        pr: drawerCollapsed ? '20px' : '16px'
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: drawerCollapsed ? 'unset' : '56px',
                          justifyContent: 'center',
                          transition: `min-width ${animationDuration} ${customEasing}`
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {!drawerCollapsed && (
                        <ListItemText
                          primary={item.title}
                          sx={{
                            transition: `opacity ${animationDuration} ${customEasing}`,
                            opacity: drawerCollapsed ? 0 : 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        />
                      )}
                    </NavItem>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>

          {/* Admin section at the bottom */}
          {adminOptions.length > 0 && (
            <List component="nav" dense sx={{ overflow: 'hidden', mt: 'auto' }}>
              {adminOptions.map((item, index) => {
                if (item.isHeader) {
                  return (
                    <React.Fragment key={`admin-header-${index}`}>
                      {!drawerCollapsed && (
                        <SectionHeader title={item.title} collapsed={drawerCollapsed} />
                      )}
                    </React.Fragment>
                  );
                }

                return (
                  <ListItem key={item.title} disablePadding sx={{ overflow: 'hidden' }}>
                    <Tooltip title={drawerCollapsed ? item.title : ''} placement="right">
                      <NavItem
                        component={NavLink}
                        to={item.navTo}
                        sx={{
                          pl: drawerCollapsed ? '20px' : '16px',
                          pr: drawerCollapsed ? '20px' : '16px'
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: drawerCollapsed ? 'unset' : '56px',
                            justifyContent: 'center',
                            transition: `min-width ${animationDuration} ${customEasing}`
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {!drawerCollapsed && (
                          <ListItemText
                            primary={item.title}
                            sx={{
                              transition: `opacity ${animationDuration} ${customEasing}`,
                              opacity: drawerCollapsed ? 0 : 1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          />
                        )}
                      </NavItem>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          )}

          {/* Theme toggle button at the bottom */}
          <Box
            sx={{
              px: drawerCollapsed ? 1 : 2,
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              transition: `all ${animationDuration} ${customEasing}`
            }}
          >
            <Tooltip
              title={mode === 'dark' ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
              placement="right"
              sx={{ textWrap: 'nowrap' }}
            >
              <IconButton
                onClick={toggleThemeMode}
                sx={{
                  width: '100%',
                  borderRadius: drawerCollapsed ? '50%' : '8px',
                  justifyContent: drawerCollapsed ? 'center' : 'flex-start',
                  px: drawerCollapsed ? 0 : 2,
                  py: 1.5
                }}
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                {!drawerCollapsed && (
                  <Typography
                    sx={{
                      ml: 2,
                      transition: `opacity ${animationDuration} ${customEasing}`,
                      opacity: drawerCollapsed ? 0 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {mode === 'dark' ? 'Svetlý režim' : 'Tmavý režim'}
                  </Typography>
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {/* {!user?.isAdmin && (
            <Box
              sx={{
                px: 2,
                mt: 'auto',
                mb: 2,
                transition: `all ${animationDuration} ${customEasing}`,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
            >
              {!drawerCollapsed && (
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    transition: `opacity ${animationDuration} ${customEasing}`,
                    opacity: drawerCollapsed ? 0 : 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Zvoľ predmet:
                </Typography>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: drawerCollapsed ? 'center' : 'flex-start',
                  width: '100%'
                }}
              >
                <TeamSwitcher collapsed={drawerCollapsed} />
              </Box>
            </Box>
          )} */}
        </Stack>
      </Box>
    );
  }
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
};
SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  collapsed: PropTypes.bool.isRequired
};

// Use default parameter values instead of defaultProps for function components
// MainLayout: children = null by default
// SectionHeader: title = '', collapsed = false by default

export default MainLayout;
